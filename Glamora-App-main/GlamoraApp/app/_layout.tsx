import { Stack } from "expo-router";
import { SocketProvider } from "./contexts/SocketContext";
import UserProvider from "./contexts/UserContext";

export default function RootLayout() {
  return (
    <UserProvider>
      <SocketProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </SocketProvider>
    </UserProvider>
  );
}
  