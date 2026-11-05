import { requireOptionalNativeModule } from 'expo';

type TextSizeModule = {
  /** Android: `scale` is the font scale (0 = system). iOS: `category` is a `UIContentSizeCategory` (null = system). */
  apply(scaleOrCategory: number | string | null, bold: boolean): Promise<void>;
  /** Android only: the device's font scale, ignoring the app's override. */
  systemFontScale?(): number;
};

/** Null in Expo Go / tests, or before a rebuild with this module. */
export default requireOptionalNativeModule<TextSizeModule>('TextSize');
