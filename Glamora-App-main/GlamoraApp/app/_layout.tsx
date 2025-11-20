import { Stack } from "expo-router";
import { SocketProvider } from "./contexts/SocketContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import UserProvider from "./contexts/UserContext";

export default function RootLayout() {
  return (
    <ThemeProvider>
      <UserProvider>
        <SocketProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </SocketProvider>
      </UserProvider>
    </ThemeProvider>
  );
}
  