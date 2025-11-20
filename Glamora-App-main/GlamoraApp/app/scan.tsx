import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, StatusBar, Dimensions } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from './contexts/ThemeContext';

const { width } = Dimensions.get('window');

export default function Scan() {
  const { theme } = useTheme();
  const [image, setImage] = useState<string | null>(null);
  const [facing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);
  const router = useRouter();

  useEffect(() => {
    if (permission && !permission.granted) {
      requestPermission();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permission]);

  const takePicture = async (): Promise<void> => {
    if (cameraRef.current && permission?.granted) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 1,
          base64: false,
        });
        if (photo) {
          setImage(photo.uri);
          router.push({ pathname: '/scannedclothes', params: { imageUri: photo.uri } });
        }
      } catch (error) {
        console.error('Error taking picture:', error);
      }
    }
  };

  const pickFromGallery = async (): Promise<void> => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });
    if (!result.canceled && result.assets.length > 0) {
      setImage(result.assets[0].uri);
      router.push({ pathname: '/scannedclothes', params: { imageUri: result.assets[0].uri } });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bodyBackground }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.bodyBackground} />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.headerBackground }]}>
        <TouchableOpacity style={[styles.backButton, { backgroundColor: theme.colors.containerBackground }]} onPress={() => router.push('/wardrobe')}>
          <Ionicons name="close" size={24} color={theme.colors.icon} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.headerText }]}>GLAMORA SCAN</Text>
        <TouchableOpacity style={[styles.flashButton, { backgroundColor: theme.colors.containerBackground }]}>
          <Ionicons name="flash" size={24} color={theme.colors.icon} />
        </TouchableOpacity>
      </View>

      {/* Camera/Preview Area */}
      <View style={styles.cameraContainer}>
        {image ? (
          <Image source={{ uri: image }} style={styles.preview} resizeMode="cover" />
        ) : permission?.granted ? (
          <View style={styles.cameraPlaceholder}>
            <CameraView
              style={StyleSheet.absoluteFillObject}
              facing={facing}
              ref={cameraRef}
            />
            <View style={styles.scanFrame}>
              <View style={styles.cornerTopLeft} />
              <View style={styles.cornerTopRight} />
              <View style={styles.cornerBottomLeft} />
              <View style={styles.cornerBottomRight} />
            </View>
            <Text style={[styles.instructionText, { color: theme.colors.primaryText }]}>
              Position clothing item within the frame
            </Text>
          </View>
        ) : (
          <View style={styles.cameraPlaceholder}>
            <Text style={[styles.instructionText, { color: theme.colors.primaryText }]}>
              No access to camera
            </Text>
          </View>
        )}
      </View>

      {/* Bottom Controls */}
      <View style={[styles.bottomControls, { backgroundColor: theme.colors.headerBackground }]}>
        <TouchableOpacity style={[styles.galleryButton, { backgroundColor: theme.colors.containerBackground, borderColor: theme.colors.border }]} onPress={pickFromGallery}>
          <Text style={[styles.galleryText, { color: theme.colors.primaryText }]}>Gallery</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.captureButton, { backgroundColor: theme.colors.buttonBackground }]} onPress={takePicture}>
          <View style={[styles.captureButtonInner, { backgroundColor: theme.colors.accent }]}>
            <Ionicons name="camera" size={32} color={theme.colors.buttonText} />
          </View>
        </TouchableOpacity>
        
        <View style={styles.placeholder} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  flashButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  cameraPlaceholder: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  scanFrame: {
    width: width * 0.7,
    height: width * 0.7,
    position: 'relative',
  },
  cornerTopLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 30,
    height: 30,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#fff',
  },
  cornerTopRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 30,
    height: 30,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: '#fff',
  },
  cornerBottomLeft: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 30,
    height: 30,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#fff',
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: '#fff',
  },
  instructionText: {
    fontSize: 16,
    marginTop: 30,
    textAlign: 'center',
    opacity: 0.8,
  },
  preview: {
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: 10,
    resizeMode: 'cover',
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 40,
    paddingTop: 20,
  },
  galleryButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
  },
  galleryText: {
    fontSize: 16,
    fontWeight: '500',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    width: 60,
    height: 40,
  },
});