<#
.SYNOPSIS
  Idempotently creates every list, library, column, index, lookup, view and permission the
  Anniversary Portal web part needs. Safe to run repeatedly.

.PARAMETER SiteUrl
  The communication site, e.g. https://contoso.sharepoint.com/sites/Anniversary20

.PARAMETER ClientId
  Entra ID app (client) id registered for PnP PowerShell interactive login (required by PnP.PowerShell 2.x+).

.PARAMETER OwnersGroup
  Name of the SharePoint group whose members manage content. Created if missing.

.PARAMETER SkipPermissions
  Create the data model only; do not touch site or list permissions.

.EXAMPLE
  ./Provision-Portal.ps1 -SiteUrl https://contoso.sharepoint.com/sites/Anniversary20 -ClientId 00000000-0000-0000-0000-000000000000

  Requires: PnP.PowerShell 2.x or later, and Site Owner (or Full Control) rights on the site.
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory)] [string] $SiteUrl,
  [Parameter(Mandatory)] [string] $ClientId,
  [string] $OwnersGroup = 'Portal Owners',
  [switch] $SkipPermissions
)
$ErrorActionPreference = 'Stop'
Connect-PnPOnline -Url $SiteUrl -ClientId $ClientId -Interactive

# ---------- helpers ----------
function Write-Step($m) { Write-Host "  - $m" }

function Ensure-List([string]$Name, [string]$Template) {
  $l = Get-PnPList -Identity $Name -ErrorAction SilentlyContinue
  if ($l) { Write-Step "$Name exists"; return $l }
  Write-Step "creating $Name"
  $url = if ($Template -eq 'DocumentLibrary') { $Name } else { "Lists/$Name" }
  New-PnPList -Title $Name -Url $url -Template $Template -OnQuickLaunch:$false | Out-Null
  return (Get-PnPList -Identity $Name)
}

function XmlEsc([string]$s) { return [System.Security.SecurityElement]::Escape($s) }

# Adds a column with an explicit space-free internal name. Existing columns are left alone.
function Ensure-Field([string]$List, [string]$Name, [string]$Type, [hashtable]$Opt = @{}) {
  if (Get-PnPField -List $List -Identity $Name -ErrorAction SilentlyContinue) { return }
  $attrs = "Name=`"$Name`" StaticName=`"$Name`" DisplayName=`"$Name`" Type=`"$Type`" Required=`"FALSE`""
  foreach ($k in $Opt.Keys) { if ($k -notin @('Choices', 'Default', 'ListId', 'FillIn')) { $attrs += " $k=`"$($Opt[$k])`"" } }
  $inner = ''
  if ($Opt.ContainsKey('Choices')) {
    $inner += '<CHOICES>' + (($Opt.Choices | ForEach-Object { '<CHOICE>' + (XmlEsc $_) + '</CHOICE>' }) -join '') + '</CHOICES>'
    if ($Opt.ContainsKey('FillIn')) { $attrs += " FillInChoice=`"$($Opt.FillIn)`"" }
  }
  if ($Opt.ContainsKey('Default')) { $inner += "<Default>$($Opt.Default)</Default>" }
  if ($Opt.ContainsKey('ListId')) { $attrs += " List=`"{$($Opt.ListId)}`" ShowField=`"Title`" RelationshipDeleteBehavior=`"Restrict`"" }
  Write-Step "  column $List.$Name ($Type)"
  Add-PnPFieldFromXml -List $List -FieldXml "<Field $attrs>$inner</Field>" | Out-Null
}

function Set-DisplayName([string]$List, [string]$Name, [string]$Display) {
  Set-PnPField -List $List -Identity $Name -Values @{ Title = $Display } | Out-Null
}

function Ensure-Index([string]$List, [string]$Name, [switch]$Unique) {
  $v = @{ Indexed = $true }
  if ($Unique) { $v.EnforceUniqueValues = $true }
  Set-PnPField -List $List -Identity $Name -Values $v | Out-Null
}

function Ensure-View([string]$List, [string]$Title, [string[]]$Fields, [string]$Query = '', [switch]$Default) {
  $v = Get-PnPView -List $List -Identity $Title -ErrorAction SilentlyContinue
  if (-not $v) {
    if ($Query) { Add-PnPView -List $List -Title $Title -Fields $Fields -Query $Query -SetAsDefault:$Default | Out-Null }
    else { Add-PnPView -List $List -Title $Title -Fields $Fields -SetAsDefault:$Default | Out-Null }
  } else {
    Set-PnPView -List $List -Identity $Title -Fields $Fields | Out-Null
  }
}

function Update-DefaultView([string]$List, [string[]]$Fields, [string]$ViewName) {
  $v = Get-PnPView -List $List -Identity $ViewName -ErrorAction SilentlyContinue
  if ($v) { Set-PnPView -List $List -Identity $ViewName -Fields $Fields | Out-Null }
}

$bool0 = @{ Default = '0' }
$bool1 = @{ Default = '1' }

# ---------- 1. Lookup targets first ----------
Write-Host 'Lookup lists'
Ensure-List 'Branches' 'GenericList' | Out-Null
Ensure-Field 'Branches' 'Region' 'Choice' @{ Choices = @('Greater Accra', 'Ashanti', 'Western', 'Western North', 'Central', 'Eastern', 'Volta', 'Oti', 'Northern', 'Savannah', 'North East', 'Upper East', 'Upper West', 'Bono', 'Bono East', 'Ahafo'); FillIn = 'TRUE'; Format = 'Dropdown' }
Ensure-Field 'Branches' 'Active' 'Boolean' $bool1
Set-DisplayName 'Branches' 'Title' 'Branch'
Ensure-Index 'Branches' 'Active'
Update-DefaultView 'Branches' @('LinkTitle', 'Region', 'Active') 'All Items'

Ensure-List 'Departments' 'GenericList' | Out-Null
Ensure-Field 'Departments' 'Active' 'Boolean' $bool1
Set-DisplayName 'Departments' 'Title' 'Department'
Ensure-Index 'Departments' 'Active'
Update-DefaultView 'Departments' @('LinkTitle', 'Active') 'All Items'

$branchesId = (Get-PnPList -Identity 'Branches').Id
$departmentsId = (Get-PnPList -Identity 'Departments').Id

# ---------- 2. Lists ----------
Write-Host 'PortalContent'
Ensure-List 'PortalContent' 'GenericList' | Out-Null
Ensure-Field 'PortalContent' 'Value' 'Note' @{ NumLines = '6'; RichText = 'FALSE' }
Ensure-Field 'PortalContent' 'DateValue' 'DateTime' @{ Format = 'DateTime' }
Ensure-Field 'PortalContent' 'ContentGroup' 'Choice' @{ Choices = @('Hero', 'Countdown', 'Headings', 'Footer'); Format = 'Dropdown' }
Set-DisplayName 'PortalContent' 'Title' 'Key'
Ensure-Index 'PortalContent' 'Title' -Unique
Update-DefaultView 'PortalContent' @('LinkTitle', 'Value', 'DateValue', 'ContentGroup') 'All Items'

Write-Host 'Timeline'
Ensure-List 'Timeline' 'GenericList' | Out-Null
Ensure-Field 'Timeline' 'Year' 'Number' @{ Decimals = '0' }
Ensure-Field 'Timeline' 'SortOrder' 'Number'
Set-DisplayName 'Timeline' 'Title' 'Milestone'
Ensure-Index 'Timeline' 'SortOrder'
Update-DefaultView 'Timeline' @('SortOrder', 'Year', 'LinkTitle') 'All Items'

Write-Host 'KeyStats'
Ensure-List 'KeyStats' 'GenericList' | Out-Null
Ensure-Field 'KeyStats' 'Value' 'Text'
Ensure-Field 'KeyStats' 'SortOrder' 'Number'
Set-DisplayName 'KeyStats' 'Title' 'Label'
Update-DefaultView 'KeyStats' @('SortOrder', 'LinkTitle', 'Value') 'All Items'

Write-Host 'Legends'
Ensure-List 'Legends' 'GenericList' | Out-Null
# Department and Branch are plain text so they paste and import quickly (no lookups).
foreach ($c in @('Department', 'Branch')) {
  $f = Get-PnPField -List 'Legends' -Identity $c -ErrorAction SilentlyContinue
  if ($f -and $f.TypeAsString -ne 'Text') { Write-Warning "Legends.$c is a $($f.TypeAsString) column. Delete it and re-run so it becomes single line of text." }
}
Ensure-Field 'Legends' 'Department' 'Text'
Ensure-Field 'Legends' 'Position' 'Text'
Ensure-Field 'Legends' 'Branch' 'Text'
Ensure-Field 'Legends' 'Joined' 'DateTime' @{ Format = 'DateOnly' }
Ensure-Field 'Legends' 'Quote' 'Note' @{ NumLines = '4'; RichText = 'FALSE' }
Ensure-Field 'Legends' 'CareerHighlights' 'Note' @{ NumLines = '6'; RichText = 'FALSE' }
Ensure-Field 'Legends' 'FunFact' 'Note' @{ NumLines = '4'; RichText = 'FALSE' }
Ensure-Field 'Legends' 'Photo' 'Thumbnail'
Ensure-Field 'Legends' 'SortOrder' 'Number'
Ensure-Field 'Legends' 'Active' 'Boolean' $bool1
Set-DisplayName 'Legends' 'Title' 'Name'
Ensure-Index 'Legends' 'Active'
Ensure-Index 'Legends' 'SortOrder'
Update-DefaultView 'Legends' @('SortOrder', 'LinkTitle', 'Department', 'Position', 'Branch', 'Joined', 'Photo', 'Active') 'All Items'

Write-Host 'MemoryLane'
Ensure-List 'MemoryLane' 'GenericList' | Out-Null
Ensure-Field 'MemoryLane' 'Year' 'Number' @{ Decimals = '0' }
Ensure-Field 'MemoryLane' 'Photo' 'Thumbnail'
Ensure-Field 'MemoryLane' 'SortOrder' 'Number'
Set-DisplayName 'MemoryLane' 'Title' 'Caption'
Update-DefaultView 'MemoryLane' @('SortOrder', 'Year', 'LinkTitle', 'Photo') 'All Items'

Write-Host 'LeadershipMessages'
Ensure-List 'LeadershipMessages' 'GenericList' | Out-Null
Ensure-Field 'LeadershipMessages' 'Message' 'Note' @{ NumLines = '6'; RichText = 'FALSE' }
Ensure-Field 'LeadershipMessages' 'SortOrder' 'Number'
Update-DefaultView 'LeadershipMessages' @('SortOrder', 'LinkTitle', 'Message') 'All Items'

Write-Host 'BoardMessages'
Ensure-List 'BoardMessages' 'GenericList' | Out-Null
$legendsId = (Get-PnPList -Identity 'Legends').Id
Ensure-Field 'BoardMessages' 'Message' 'Note' @{ NumLines = '6'; RichText = 'FALSE' }
Ensure-Field 'BoardMessages' 'Celebrating' 'Lookup' @{ ListId = $legendsId; Indexed = 'TRUE' }
Ensure-Field 'BoardMessages' 'Tags' 'MultiChoice' @{ Choices = @('Leadership', 'Teamwork', 'Innovation', 'Customer Focus', 'Audacious Steps', 'Appreciation') }
Ensure-Field 'BoardMessages' 'Featured' 'Boolean' $bool0
Ensure-Field 'BoardMessages' 'Published' 'Boolean' $bool1
Ensure-Index 'BoardMessages' 'Published'
Ensure-Index 'BoardMessages' 'Featured'
Ensure-Index 'BoardMessages' 'Celebrating'
Ensure-Index 'BoardMessages' 'Created'
Update-DefaultView 'BoardMessages' @('LinkTitle', 'Celebrating', 'Tags', 'Featured', 'Published', 'Author', 'Created') 'All Items'
Ensure-View 'BoardMessages' 'Hidden messages' @('LinkTitle', 'Celebrating', 'Author', 'Created') '<Where><Eq><FieldRef Name="Published"/><Value Type="Boolean">0</Value></Eq></Where>'

Write-Host 'GalleryMedia (library)'
Ensure-List 'GalleryMedia' 'DocumentLibrary' | Out-Null
Ensure-Field 'GalleryMedia' 'Category' 'Choice' @{ Choices = @('Then & Now', 'Branch Celebrations', 'Team Moments', 'Community Impact', 'Anniversary Events', 'Fun Memories'); Format = 'Dropdown' }
# Branch and Region are typed freely (no fixed list), so whoever uploads can write any branch or region.
$gb = Get-PnPField -List 'GalleryMedia' -Identity 'Branch' -ErrorAction SilentlyContinue
if ($gb -and $gb.TypeAsString -eq 'Lookup') { Write-Warning 'GalleryMedia.Branch is still a Lookup from an earlier run. Delete that column and re-run to get the free-text Branch.' }
Ensure-Field 'GalleryMedia' 'Branch' 'Text'
Ensure-Field 'GalleryMedia' 'Region' 'Text'
Ensure-Field 'GalleryMedia' 'Department' 'Lookup' @{ ListId = $departmentsId; Indexed = 'TRUE' }
Ensure-Field 'GalleryMedia' 'Featured' 'Boolean' $bool0
Ensure-Field 'GalleryMedia' 'Published' 'Boolean' $bool1
Ensure-Field 'GalleryMedia' 'Credit' 'Text'
Ensure-Field 'GalleryMedia' 'DateTaken' 'DateTime' @{ Format = 'DateOnly' }
Set-DisplayName 'GalleryMedia' 'Title' 'Caption'
Ensure-Index 'GalleryMedia' 'Published'
Ensure-Index 'GalleryMedia' 'Featured'
Ensure-Index 'GalleryMedia' 'Category'
Ensure-Index 'GalleryMedia' 'Created'
Update-DefaultView 'GalleryMedia' @('DocIcon', 'LinkFilename', 'Title', 'Category', 'Branch', 'Region', 'Department', 'Featured', 'Published', 'Credit', 'DateTaken') 'All Documents'
Ensure-View 'GalleryMedia' 'Hidden items' @('DocIcon', 'LinkFilename', 'Title', 'Category') '<Where><Eq><FieldRef Name="Published"/><Value Type="Boolean">0</Value></Eq></Where>'

Write-Host 'PortalAssets (library)'
Ensure-List 'PortalAssets' 'DocumentLibrary' | Out-Null
Ensure-Field 'PortalAssets' 'AssetType' 'Choice' @{ Choices = @('HeroVideo', 'HeroPoster', 'Logo', 'BackgroundMusic', 'AnniversaryVideo', 'VideoPoster', 'Other'); Format = 'Dropdown' }
Ensure-Field 'PortalAssets' 'Active' 'Boolean' $bool1
Ensure-Index 'PortalAssets' 'Active'
Update-DefaultView 'PortalAssets' @('DocIcon', 'LinkFilename', 'Title', 'AssetType', 'Active') 'All Documents'

Write-Host 'GalleryReactions'
Ensure-List 'GalleryReactions' 'GenericList' | Out-Null
$mediaId = (Get-PnPList -Identity 'GalleryMedia').Id
Ensure-Field 'GalleryReactions' 'GalleryItem' 'Lookup' @{ ListId = $mediaId; Indexed = 'TRUE' }
Ensure-Field 'GalleryReactions' 'Reaction' 'Choice' @{ Choices = @('Like', 'Clap', 'Celebrate', 'Love'); Format = 'Dropdown' }
Ensure-Field 'GalleryReactions' 'ReactionKey' 'Text'
Ensure-Index 'GalleryReactions' 'GalleryItem'
Ensure-Index 'GalleryReactions' 'ReactionKey' -Unique
Update-DefaultView 'GalleryReactions' @('LinkTitle', 'GalleryItem', 'Reaction', 'ReactionKey', 'Author', 'Created') 'All Items'

Write-Host 'GalleryComments'
Ensure-List 'GalleryComments' 'GenericList' | Out-Null
Ensure-Field 'GalleryComments' 'GalleryItem' 'Lookup' @{ ListId = $mediaId; Indexed = 'TRUE' }
Ensure-Field 'GalleryComments' 'Comment' 'Note' @{ NumLines = '4'; RichText = 'FALSE' }
Ensure-Field 'GalleryComments' 'Published' 'Boolean' $bool1
Ensure-Index 'GalleryComments' 'GalleryItem'
Ensure-Index 'GalleryComments' 'Published'
Update-DefaultView 'GalleryComments' @('LinkTitle', 'GalleryItem', 'Comment', 'Published', 'Author', 'Created') 'All Items'
Ensure-View 'GalleryComments' 'Hidden comments' @('LinkTitle', 'GalleryItem', 'Comment', 'Author') '<Where><Eq><FieldRef Name="Published"/><Value Type="Boolean">0</Value></Eq></Where>'

Write-Host 'BoardStats (optional, for a nightly Power Automate flow)'
Ensure-List 'BoardStats' 'GenericList' | Out-Null
Ensure-Field 'BoardStats' 'Value' 'Note' @{ NumLines = '4'; RichText = 'FALSE' }
Update-DefaultView 'BoardStats' @('LinkTitle', 'Value') 'All Items'

# ---------- 3. Permissions ----------
if (-not $SkipPermissions) {
  Write-Host 'Permissions'
  $owners = Get-PnPGroup -Identity $OwnersGroup -ErrorAction SilentlyContinue
  if (-not $owners) { Write-Step "creating group $OwnersGroup"; $owners = New-PnPGroup -Title $OwnersGroup -Description 'Manage Anniversary Portal content' }
  # Portal Owners: Edit on the site (Edit includes Manage Lists, which the web part uses to detect owners).
  Set-PnPWebPermission -Group $OwnersGroup -AddRole 'Edit'
  $members = Get-PnPGroup -AssociatedMemberGroup
  $visitors = Get-PnPGroup -AssociatedVisitorGroup
  # Visitors and Members: Read on the site (Members normally have Edit, which would make them look like owners).
  Set-PnPWebPermission -Group $members.Title -RemoveRole 'Edit'
  Set-PnPWebPermission -Group $members.Title -AddRole 'Read'
  Set-PnPWebPermission -Group $visitors.Title -AddRole 'Read'
  # Staff-created lists: read all, create, and edit/delete only your own items.
  foreach ($name in @('BoardMessages', 'GalleryReactions', 'GalleryComments')) {
    Write-Step "$name: breaking inheritance, item-level security"
    Set-PnPList -Identity $name -BreakRoleInheritance -CopyRoleAssignments | Out-Null
    Set-PnPList -Identity $name -ReadSecurity 1 -WriteSecurity 2 | Out-Null     # 1 = read all items; 2 = create + edit own items
    foreach ($g in @($members.Title, $visitors.Title)) { Set-PnPListPermission -Identity $name -Group $g -AddRole 'Contribute' }
  }
}

Write-Host 'Done. Next: run Seed-Portal.ps1.'
