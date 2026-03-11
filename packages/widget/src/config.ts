
export type WidgetMode = "standard" | "webpage";

export interface WebpageConfig {
  /**
   * The URL to load in the widget.
   */
  targetURL: string;
  
  /**
   * If true, the widget will attempt to import cookies from the system's default browser
   * for the target domain.
   * @default true
   */
  useBrowserCookies?: boolean;
}

export interface WidgetConfig {
  /**
   * The minimum version of Cosmo required to run this widget.
   * Format: "x.y.z"
   */
  minCosmoVersion: string;

  /**
   * The default width of the widget window.
   */
  defaultWidth: number;

  /**
   * The default height of the widget window.
   */
  defaultHeight: number;

  /**
   * The minimum width of the widget window.
   */
  minWidth: number;

  /**
   * The minimum height of the widget window.
   */
  minHeight: number;

  /**
   * The maximum width of the widget window.
   */
  maxWidth?: number;

  /**
   * The maximum height of the widget window.
   */
  maxHeight?: number;

  /**
   * Whether the widget window can be resized by the user.
   */
  allowResize: boolean;

  /**
   * Whether to force the aspect ratio when resizing.
   */
  keepAspectRatio: boolean; // default false

  /**
   * Whether the widget refuses to be shown on lock screen.
   */
  allowLockScreen: boolean; // default false
  
  /**
   * Whether the widget is allowed to access the internet.
   */
  allowInternet?: boolean;

  /**
   * Default position on screen (0-1 relative coordinates).
   * [x, y]
   */
  defaultPos?: [number, number];

  /**
   * Radius of the background blur effect.
   */
  backgroundBlurRadius?: number;

  /**
   * The mode of the widget.
   * "standard": A normal widget with index.html.
   * "webpage": A widget that wraps an external webpage.
   * @default "standard"
   */
  mode?: WidgetMode;

  /**
   * Configuration specific to webpage mode.
   * Required if mode is "webpage".
   */
  webpage?: WebpageConfig;
}
