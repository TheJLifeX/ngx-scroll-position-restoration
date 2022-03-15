export interface NgxScrollPositionRestorationConfig {
  /**
   * Define how long to poll the document after a route change in order to look for elements that need to be restored to a previous scroll position. Value in milliseconds.
   * 
   * @default
   * 3000 // 3 seconds
   */
  pollDuration?: number;
  /**
   * Define the cadence to pool the document to restore previous scroll positions (maximum until the `pollDuration`). Value in milliseconds.
   * 
   * @default
   * 50
   */
  pollCadence?: number;
  /**
   * Debugging.
   * 
   * @default
   * false
   */
  debug?: boolean;
}
