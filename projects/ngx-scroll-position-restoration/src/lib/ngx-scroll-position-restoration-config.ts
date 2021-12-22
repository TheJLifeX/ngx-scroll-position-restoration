export interface NgxScrollPositionRestorationConfig {
  /**
   * Define how long to poll the document after a route change in order to look for elements that need to be restored to a previous offset. Value in milliseconds.
   * 
   * @default
   * 3000 // 3 seconds
   */
  pollDuration?: number;
  /**
   * Value in milliseconds.
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
