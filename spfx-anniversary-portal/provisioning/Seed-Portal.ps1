<#
.SYNOPSIS
  Loads the starter data (seed.json) and uploads the page media into PortalAssets.
  Create-if-missing: running it again never duplicates rows and never overwrites edits.

.PARAMETER BranchesCsv
  Optional CSV with columns Title,Region for the full branch list. Until supplied, only
  "Head Office" and the branches used by the legends are created.

.EXAMPLE
  ./Seed-Portal.ps1 -SiteUrl https://contoso.sharepoint.com/sites/Anniversary20 -ClientId <app id>
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory)] [string] $SiteUrl,
  [Parameter(Mandatory)] [string] $ClientId,
  [string] $BranchesCsv,
  [switch] $SkipMedia
)
$ErrorActionPreference = 'Stop'
Connect-PnPOnline -Url $SiteUrl -ClientId $ClientId -Interactive
$seed = Get-Content -Raw -Path (Join-Path $PSScriptRoot 'seed.json') -Encoding UTF8 | ConvertFrom-Json

function Find-Item([string]$List, [string]$Field, [string]$Value) {
  $esc = [System.Security.SecurityElement]::Escape($Value)
  $q = "<View><Query><Where><Eq><FieldRef Name='$Field'/><Value Type='Text'>$esc</Value></Eq></Where></Query><RowLimit>1</RowLimit></View>"
  return (Get-PnPListItem -List $List -Query $q | Select-Object -First 1)
}
function Lookup-Id([string]$List, [string]$Title) {
  if (-not $Title) { return $null }
  $i = Find-Item $List 'Title' $Title
  if ($i) { return $i.Id }
  Write-Warning "No '$Title' in $List"
  return $null
}
function Add-IfMissing([string]$List, [string]$Title, [hashtable]$Values) {
  if (Find-Item $List 'Title' $Title) { return }
  Write-Host "  + $List : $Title"
  Add-PnPListItem -List $List -Values $Values | Out-Null
}
function H($o) { $h = @{}; $o.PSObject.Properties | ForEach-Object { $h[$_.Name] = $_.Value }; return $h }

Write-Host 'Departments'
foreach ($d in $seed.Departments) { Add-IfMissing 'Departments' $d.Title @{ Title = $d.Title; Active = $true } }

Write-Host 'Branches'
foreach ($b in $seed.Branches) { Add-IfMissing 'Branches' $b.Title @{ Title = $b.Title; Active = $true } }
if ($BranchesCsv) {
  foreach ($r in (Import-Csv -Path $BranchesCsv -Encoding UTF8)) {
    $v = @{ Title = $r.Title; Active = $true }
    if ($r.Region) { $v.Region = $r.Region }
    Add-IfMissing 'Branches' $r.Title $v
  }
}

Write-Host 'PortalContent'
foreach ($c in $seed.PortalContent) {
  $v = @{ Title = $c.Title; Value = $c.Value; ContentGroup = $c.ContentGroup }
  if ($c.DateValue) { $v.DateValue = [datetime]::Parse($c.DateValue).ToUniversalTime() }
  Add-IfMissing 'PortalContent' $c.Title $v
}

Write-Host 'Timeline / KeyStats / MemoryLane / LeadershipMessages'
foreach ($t in $seed.Timeline) { Add-IfMissing 'Timeline' $t.Title @{ Title = $t.Title; Year = $t.Year; SortOrder = $t.SortOrder } }
foreach ($k in $seed.KeyStats) { Add-IfMissing 'KeyStats' $k.Title @{ Title = $k.Title; Value = $k.Value; SortOrder = $k.SortOrder } }
foreach ($m in $seed.MemoryLane) { Add-IfMissing 'MemoryLane' $m.Title @{ Title = $m.Title; Year = $m.Year; SortOrder = $m.SortOrder } }
foreach ($m in $seed.LeadershipMessages) { Add-IfMissing 'LeadershipMessages' $m.Title @{ Title = $m.Title; Message = $m.Message; SortOrder = $m.SortOrder } }

# Image columns store a JSON pointer to a file kept under SiteAssets/Lists/<list id>/.
function Set-LegendPhoto([string]$Title, [string]$File) {
  $item = Find-Item 'Legends' 'Title' $Title
  if (-not $item) { return }
  if ($item['Photo']) { return }   # never overwrite a photo someone already set
  $path = Join-Path $PSScriptRoot "media/$File"
  if (-not (Test-Path $path)) { Write-Warning "Missing $path"; return }
  $list = Get-PnPList -Identity 'Legends'
  $web = Get-PnPWeb
  $folder = "SiteAssets/Lists/$($list.Id.ToString().ToLower())"
  Ensure-PnPFolder -SiteRelativePath $folder | Out-Null
  $name = Split-Path $path -Leaf
  Add-PnPFile -Path $path -Folder $folder | Out-Null
  $rel = "$($web.ServerRelativeUrl.TrimEnd('/'))/$folder/$name"
  $json = @{ type = 'thumbnail'; fileName = $name; fieldName = 'Photo'; serverUrl = ([uri]$SiteUrl).GetLeftPart('Authority'); serverRelativeUrl = $rel; id = [guid]::NewGuid().ToString() } | ConvertTo-Json -Compress
  Set-PnPListItem -List 'Legends' -Identity $item.Id -Values @{ Photo = $json } | Out-Null
  Write-Host "  + photo for $Title"
}

Write-Host 'Legends'
foreach ($l in $seed.Legends) {
  $v = @{
    Title = $l.Title; Position = $l.Position; Joined = [datetime]::Parse($l.Joined); Quote = $l.Quote
    CareerHighlights = $l.CareerHighlights; FunFact = $l.FunFact; SortOrder = $l.SortOrder; Active = $true
  }
  $d = Lookup-Id 'Departments' $l.Department; if ($d) { $v.Department = $d }
  $b = Lookup-Id 'Branches' $l.Branch; if ($b) { $v.Branch = $b }
  Add-IfMissing 'Legends' $l.Title $v
  if ($l.PhotoFile -and -not $SkipMedia) { Set-LegendPhoto $l.Title $l.PhotoFile }
}

Write-Host 'BoardMessages (samples)'
foreach ($m in $seed.BoardMessages) {
  $v = @{ Title = $m.Title; Message = $m.Message; Tags = [string[]]$m.Tags; Featured = [bool]$m.Featured; Published = $true }
  $c = Lookup-Id 'Legends' $m.Celebrating; if ($c) { $v.Celebrating = $c }
  Add-IfMissing 'BoardMessages' $m.Title $v
}

if (-not $SkipMedia) {
  Write-Host 'PortalAssets (media upload)'
  $dir = Join-Path $PSScriptRoot 'media'
  foreach ($a in (Get-Content -Raw -Path (Join-Path $dir 'assets.json') | ConvertFrom-Json)) {
    $path = Join-Path $dir $a.file
    if (-not (Test-Path $path)) { Write-Warning "Missing $path"; continue }
    $existing = Get-PnPFile -Url "PortalAssets/$($a.file)" -ErrorAction SilentlyContinue
    if ($existing) { Write-Host "  = $($a.file) already uploaded"; continue }
    Write-Host "  + $($a.file)"
    Add-PnPFile -Path $path -Folder 'PortalAssets' -Values @{ Title = $a.title; AssetType = $a.assetType; Active = $true } | Out-Null
  }
}
Write-Host 'Done. Photos for Legends and Memory Lane are added in the lists; gallery photos go straight into GalleryMedia.'
