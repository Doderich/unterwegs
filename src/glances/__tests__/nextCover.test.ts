import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * A clear or tinted Home Screen renders the widget in accented mode and turns an opaque photo into a
 * solid white block. The cover has to stay full color. See Apple's WidgetKit Liquid Glass notes.
 */
it('keeps the Next cover in full color on a clear or tinted Home Screen', () => {
  const source = readFileSync(join(__dirname, '../widgets/NextWidget.ios.tsx'), 'utf8');
  const cover = source.slice(source.indexOf('uiImage={props.cover}'));
  expect(cover).toContain("widgetAccentedRenderingMode('fullColor')");
});
