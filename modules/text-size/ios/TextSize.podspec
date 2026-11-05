Pod::Spec.new do |s|
  s.name           = 'TextSize'
  s.version        = '0.1.0'
  s.summary        = 'App-wide text size and bold text'
  s.description    = 'App-wide text size and bold text'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = { :ios => '16.4' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
