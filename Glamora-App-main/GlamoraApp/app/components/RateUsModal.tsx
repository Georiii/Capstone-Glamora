import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface RateUsModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (rating: number, feedback: string) => void;
}

export default function RateUsModal({ visible, onClose, onSubmit }: RateUsModalProps) {
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState('');

  const handleSubmit = () => {
    onSubmit(rating, feedback);
    setRating(5);
    setFeedback('');
    onClose();
  };

  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity
          key={i}
          onPress={() => setRating(i)}
          style={styles.starButton}
        >
          <Ionicons
            name={i <= rating ? "star" : "star-outline"}
            size={24}
            color={i <= rating ? "#000" : "#ccc"}
          />
        </TouchableOpacity>
      );
    }
    return stars;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#000" />
          </TouchableOpacity>

          {/* Title */}
          <Text style={styles.modalTitle}>Rate us</Text>

          {/* Star Rating */}
          <View style={styles.starsContainer}>
            {renderStars()}
          </View>

          {/* Feedback Instruction */}
          <Text style={styles.feedbackInstruction}>
            Provide feedback or comment
          </Text>

          {/* Feedback Input */}
          <TextInput
            style={styles.feedbackInput}
            placeholder="Write feedback"
            placeholderTextColor="#999"
            value={feedback}
            onChangeText={setFeedback}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          {/* Submit Button */}
          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
            <Text style={styles.submitButtonText}>Submit</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 350,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    padding: 8,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 20,
    marginTop: 20,
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  starButton: {
    padding: 4,
    marginHorizontal: 2,
  },
  feedbackInstruction: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
    textAlign: 'center',
  },
  feedbackInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
    marginBottom: 20,
    backgroundColor: '#f8f8f8',
  },
  submitButton: {
    backgroundColor: '#FFA500',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minWidth: 100,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
});
