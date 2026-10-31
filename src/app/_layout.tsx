import { Stack } from 'expo-router';
import { ThemeProvider } from '../context/theme-context';

export default function RootLayout() {
  return (
    <ThemeProvider>
      <Stack
        screenOptions={{
          headerShadowVisible: false,
        }}>
        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="modal-log-injection"
          options={{
            presentation: 'modal',
            headerShown: false,
            title: 'Enjeksiyon Kaydet',
          }}
        />
        <Stack.Screen
          name="modal-log-weight"
          options={{
            presentation: 'modal',
            headerShown: false,
            title: 'Kilo Kaydet',
          }}
        />
        <Stack.Screen
          name="modal-log-symptom"
          options={{
            presentation: 'modal',
            headerShown: false,
            title: 'Yan Etki Kaydet',
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}
