# Capacitor'ün ürettiği iOS projesine Set Programım ayarlarını uygular (tekrar çalıştırılabilir).
import json,os,re,shutil
A='ios/App/App'
d=f'{A}/Assets.xcassets/AppIcon.appiconset'
for f in os.listdir(d):
    if f.endswith('.png'):os.remove(os.path.join(d,f))
shutil.copy('ios-assets/AppIcon-1024.png',f'{d}/AppIcon-1024.png')
json.dump({"images":[{"filename":"AppIcon-1024.png","idiom":"universal","platform":"ios","size":"1024x1024"}],"info":{"author":"xcode","version":1}},open(f'{d}/Contents.json','w'),indent=2)
for n in os.listdir(f'{A}/Assets.xcassets/Splash.imageset'):
    if n.endswith('.png'):shutil.copy('ios-assets/splash.png',f'{A}/Assets.xcassets/Splash.imageset/{n}')
p=f'{A}/Info.plist';s=open(p).read()
s=s.replace('<key>CFBundleDevelopmentRegion</key>\n\t<string>en</string>','<key>CFBundleDevelopmentRegion</key>\n\t<string>tr</string>')
s=s.replace('<string>armv7</string>','<string>arm64</string>')
s=re.sub(r'<key>UISupportedInterfaceOrientations</key>\s*<array>.*?</array>','<key>UISupportedInterfaceOrientations</key>\n\t<array>\n\t\t<string>UIInterfaceOrientationPortrait</string>\n\t</array>',s,count=1,flags=re.S)
if 'ITSAppUsesNonExemptEncryption' not in s:
    # status bar follows the system (the app's "Otomatik" theme also follows the system)
    s=re.sub(r'<key>UIViewControllerBasedStatusBarAppearance</key>\s*<true/>','<key>UIViewControllerBasedStatusBarAppearance</key>\n\t<false/>\n\t<key>UIStatusBarStyle</key>\n\t<string>UIStatusBarStyleDefault</string>\n\t<key>ITSAppUsesNonExemptEncryption</key>\n\t<false/>\n\t<key>UIRequiresFullScreen</key>\n\t<true/>',s)
s=s.replace('<string>UIStatusBarStyleLightContent</string>','<string>UIStatusBarStyleDefault</string>')
assert 'ITSAppUsesNonExemptEncryption' in s, 'Info.plist güncellenemedi'
open(p,'w').write(s)
p=f'{A}/Base.lproj/LaunchScreen.storyboard';s=open(p).read()
s=re.sub(r'<color key="backgroundColor" [^>]*/>','<color key="backgroundColor" red="0.055" green="0.051" blue="0.047" alpha="1" colorSpace="custom" customColorSpace="sRGB"/>',s,count=1).replace('contentMode="scaleAspectFill"','contentMode="scaleAspectFit"')
open(p,'w').write(s)
p='ios/App/App.xcodeproj/project.pbxproj';s=open(p).read()
s=s.replace('TARGETED_DEVICE_FAMILY = "1,2";','TARGETED_DEVICE_FAMILY = 1;')
open(p,'w').write(s)
print('iOS ayarları uygulandı')
