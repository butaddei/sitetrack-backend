const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withSubscriptionPeriodFix = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const iosRoot = config.modRequest.platformProjectRoot;

      // Patch Podfile: fix SubscriptionPeriod ambiguity between StoreKit and react-native-purchases
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

      // Write Gemfile into ios/ so EAS uses `bundle exec pod install`
      // (EAS detects ios/Gemfile and switches from `pod install` to `bundle exec pod install`,
      //  which resolves CocoaPods through Bundler regardless of the system PATH)
      const gemfilePath = path.join(iosRoot, 'Gemfile');
      fs.writeFileSync(
        gemfilePath,
        'source "https://rubygems.org"\n\ngem "cocoapods", "~> 1.15"\n'
      );

      return config;
    },
  ]);
};

module.exports = withSubscriptionPeriodFix;
