import { NativeTabs } from 'expo-router/native-tabs';

import { useTheme } from '@/hooks/use-theme';

export default function AppTabs() {
  const colors = useTheme();

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundSelected}
      labelStyle={{ selected: { color: colors.accent } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Lesen</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={require('@/assets/images/tabIcons/read.png')} renderingMode="template" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="notizen">
        <NativeTabs.Trigger.Label>Notizen</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={require('@/assets/images/tabIcons/notes.png')} renderingMode="template" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="mehr">
        <NativeTabs.Trigger.Label>Mehr</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={require('@/assets/images/tabIcons/more.png')} renderingMode="template" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
