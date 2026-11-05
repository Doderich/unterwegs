const { withAppDelegate, withMainApplication, withAppBuildGradle } = require('expo/config-plugins');

/** OpenFreeMap's download policy: a distinct User-Agent and at most four concurrent requests. */
module.exports = function withMapDownloads(config) {
  const agent = `Unterwegs/${config.version || 'dev'} (MapLibre offline maps)`;
  config = withAppDelegate(config, (mod) => {
    if (mod.modResults.language !== 'swift') throw new Error('with-map-downloads requires a Swift AppDelegate');
    let text = mod.modResults.contents;
    if (text.includes('// Unterwegs map downloads')) return mod;
    text = 'import MapLibre\n' + text;
    const anchor = '    let delegate = ReactNativeDelegate()';
    if (!text.includes(anchor)) throw new Error('with-map-downloads: launch anchor not found');
    text = text.replace(
      anchor,
      `    // Unterwegs map downloads
    let mapNetwork = MLNNetworkConfiguration.sharedManager
    let mapSession = mapNetwork.sessionConfiguration ?? URLSessionConfiguration.default
    mapSession.httpMaximumConnectionsPerHost = 4
    var mapHeaders = mapSession.httpAdditionalHeaders ?? [:]
    mapHeaders["User-Agent"] = "${agent}"
    mapSession.httpAdditionalHeaders = mapHeaders
    mapNetwork.sessionConfiguration = mapSession
${anchor}`,
    );
    mod.modResults.contents = text;
    return mod;
  });
  config = withAppBuildGradle(config, (mod) => {
    // Matches MapLibre React Native 11.5.1. Explicit because its SDK dependency is implementation-scoped.
    if (!mod.modResults.contents.includes('// Unterwegs map downloads')) {
      mod.modResults.contents +=
        '\n// Unterwegs map downloads\ndependencies { implementation("org.maplibre.gl:android-sdk-opengl:13.6.1"); implementation("com.squareup.okhttp3:okhttp:4.12.0") }\n';
    }
    return mod;
  });
  return withMainApplication(config, (mod) => {
    let text = mod.modResults.contents;
    // HttpRequestImpl's static User-Agent reads MapLibre's application context. Initialize the SDK
    // before loading that class, including when prebuild updates an existing generated native project.
    const initialize = '    org.maplibre.android.MapLibre.getInstance(this)';
    if (text.includes('// Unterwegs map downloads')) {
      if (!text.includes(initialize)) {
        mod.modResults.contents = text.replace(
          '// Unterwegs map downloads',
          `// Unterwegs map downloads\n${initialize}`,
        );
      }
      return mod;
    }
    const anchor = '    super.onCreate()';
    if (!text.includes(anchor)) throw new Error('with-map-downloads: onCreate anchor not found');
    text = text.replace(
      anchor,
      `${anchor}
    // Unterwegs map downloads
${initialize}
    val mapDispatcher = okhttp3.Dispatcher().apply {
      maxRequests = 4
      maxRequestsPerHost = 4
    }
    org.maplibre.android.module.http.HttpRequestUtil.setOkHttpClient(
      okhttp3.OkHttpClient.Builder().dispatcher(mapDispatcher).addInterceptor { chain ->
        chain.proceed(chain.request().newBuilder().header("User-Agent", "${agent}").build())
      }.build()
    )`,
    );
    mod.modResults.contents = text;
    return mod;
  });
};
