const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// Fix 1: SubscriptionPeriod ambiguity between StoreKit and react-native-purchases
const withSubscriptionPeriodFix = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const iosRoot = config.modRequest.platformProjectRoot;

      // --- Podfile patch ---
      const podfilePath = path.join(iosRoot, 'Podfile');
      let contents = fs.readFileSync(podfilePath, 'utf8');

      const fix = `
  # Fix: 'SubscriptionPeriod' is ambiguous between StoreKit and react-native-purchases
  installer.pods_project.targets.each do |target|
    if target.name == 'react-native-purchases'
      target.build_configurations.each do |config|
        config.build_settings['SWIFT_INSTALL_OBJC_HEADER'] = 'NO'
      end
    end
  end
`;

      if (contents.includes('post_install do |installer|')) {
        contents = contents.replace(
          'post_install do |installer|',
          `post_install do |installer|\n${fix}`
        );
      } else {
        contents += `\npost_install do |installer|\n${fix}\nend\n`;
      }

      fs.writeFileSync(podfilePath, contents);

      // --- Gemfile in ios directory ---
      // EAS Build detects ios/Gemfile and uses `bundle exec pod install`
      // which finds CocoaPods via Bundler regardless of system PATH.
      const gemfilePath = path.join(iosRoot, 'Gemfile');
      if (!fs.existsSync(gemfilePath)) {
        fs.writeFileSync(
          gemfilePath,
          'source "https://rubygems.org"\n\ngem "cocoapods", "~> 1.15"\n'
        );
      }

      return config;
    },
  ]);
};

module.exports = withSubscriptionPeriodFix;
