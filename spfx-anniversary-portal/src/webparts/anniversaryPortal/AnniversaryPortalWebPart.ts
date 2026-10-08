import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Version } from '@microsoft/sp-core-library';
import {
  type IPropertyPaneConfiguration, type IPropertyPaneField, type IPropertyPaneTextFieldProps, PropertyPaneTextField,
  PropertyPaneToggle
} from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import { ThemeProvider, ThemeChangedEventArgs, IReadonlyTheme } from '@microsoft/sp-component-base';

import * as strings from 'AnniversaryPortalWebPartStrings';
import AnniversaryPortal, { IAnniversaryPortalProps } from './components/AnniversaryPortal';
import { DEFAULT_SETTINGS, IPortalSettings } from './models';
import { createSP, SPFI } from './services/sp';

export type IAnniversaryPortalWebPartProps = Partial<IPortalSettings>;

export default class AnniversaryPortalWebPart extends BaseClientSideWebPart<IAnniversaryPortalWebPartProps> {
  private sp!: SPFI;
  private isDark: boolean = false;
  private themeProvider?: ThemeProvider;

  protected onInit(): Promise<void> {
    this.sp = createSP(this.context);
    try {
      this.themeProvider = this.context.serviceScope.consume(ThemeProvider.serviceKey);
      this.applyTheme(this.themeProvider.tryGetTheme());
      this.themeProvider.themeChangedEvent.add(this, (a: ThemeChangedEventArgs) => { this.applyTheme(a.theme); this.render(); });
    } catch { /* theme provider is optional */ }
    return Promise.resolve();
  }

  private applyTheme(t?: IReadonlyTheme): void {
    this.isDark = !!(t && t.isInverted);
  }

  private settings(): IPortalSettings {
    const out = { ...DEFAULT_SETTINGS } as { [k: string]: string | boolean };
    const p = this.properties as { [k: string]: string | boolean | undefined };
    Object.keys(out).forEach(k => {
      const v = p[k];
      if (typeof out[k] === 'boolean') { if (typeof v === 'boolean') out[k] = v; }
      else if (typeof v === 'string' && v.trim()) out[k] = v.trim();
    });
    return out as unknown as IPortalSettings;
  }

  public render(): void {
    const element = React.createElement<IAnniversaryPortalProps>(AnniversaryPortal, {
      context: this.context, sp: this.sp, settings: this.settings(), isDarkTheme: this.isDark
    });
    ReactDom.render(element, this.domElement);
  }

  protected onDispose(): void {
    ReactDom.unmountComponentAtNode(this.domElement);
  }

  protected get dataVersion(): Version {
    return Version.parse('1.0');
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    const f = (key: keyof IPortalSettings, label: string): IPropertyPaneField<IPropertyPaneTextFieldProps> =>
      PropertyPaneTextField(key, { label, placeholder: String(DEFAULT_SETTINGS[key]) });
    return {
      pages: [{
        header: { description: strings.PropertyPaneDescription },
        groups: [
          { groupName: strings.ContentGroup, groupFields: [
            f('contentList', 'Portal content list'), f('timelineList', 'Timeline list'), f('keyStatsList', 'Key stats list'),
            f('legendsList', 'Legends list'), f('memoryList', 'Memory Lane list'), f('messagesList', 'Leadership messages list'),
            f('assetsLibrary', 'Portal assets library')
          ] },
          { groupName: strings.BoardGalleryGroup, groupFields: [
            f('boardList', 'Board messages list'), f('boardStatsList', 'Board stats list (optional)'),
            f('galleryLibrary', 'Gallery media library'), f('reactionsList', 'Gallery reactions list'),
            f('commentsList', 'Gallery comments list')
          ] },
          { groupName: strings.LookupGroup, groupFields: [
            f('branchesList', 'Branches list'), f('departmentsList', 'Departments list')
          ] },
          { groupName: strings.VisitorsGroup, groupFields: [
            PropertyPaneToggle('allowPosting', { label: 'Let visitors post on the board', onText: 'On', offText: 'Off (view only)' }),
            PropertyPaneToggle('allowReactions', { label: 'Let visitors react and comment on gallery photos', onText: 'On', offText: 'Off (view only)' })
          ] },
          { groupName: strings.OwnersGroup, groupFields: [f('ownersGroup', 'Portal Owners group name')] }
        ]
      }]
    };
  }
}
