import { Stack } from "expo-router";
import { SocketProvider } from "./contexts/SocketContext";
import UserProvider from "./contexts/UserContext";
import AuthProvider from "./contexts/AuthContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <UserProvider>
        <SocketProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </SocketProvider>
      </UserProvider>
    </AuthProvider>
  );
}
  