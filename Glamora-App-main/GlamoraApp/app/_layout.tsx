import { Stack } from "expo-router";
import { SocketProvider } from "./contexts/SocketContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import UserProvider from "./contexts/UserContext";
import { AdProvider } from "./contexts/AdContext";

export default function RootLayout() {
  return (
    <ThemeProvider>
      <UserProvider>
        <AdProvider>
          <SocketProvider>
            <Stack screenOptions={{ headerShown: false }} />
          </SocketProvider>
        </AdProvider>
      </UserProvider>
    </ThemeProvider>
  );
}
  