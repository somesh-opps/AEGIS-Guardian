import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import 'package:audioplayers/audioplayers.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

class TtsService {
  static final List<String> _apiKeys = dotenv.env['ELEVENLABS_API_KEYS']?.split(',') ?? [];
  static int _currentKeyIndex = 0;
  static const String _voiceId = 'EXAVITQu4vr4xnSDxMaL'; // Sarah (Free tier compatible)
  static final AudioPlayer _audioPlayer = AudioPlayer();
  static String? _lastSpokenText;

  static Future<void> announce(String text) async {
    if (text == _lastSpokenText) return; // Prevent spamming same alert
    _lastSpokenText = text;

    if (_apiKeys.isEmpty || _apiKeys[0] == 'YOUR_ELEVENLABS_API_KEY') {
      print('TTS: API Key not set. Cannot announce: $text');
      return;
    }

    try {
      final url = Uri.parse('https://api.elevenlabs.io/v1/text-to-speech/$_voiceId');
      
      for (int i = 0; i < _apiKeys.length; i++) {
        final currentKey = _apiKeys[_currentKeyIndex];
        
        // Skip unconfigured keys
        if (currentKey.isEmpty || currentKey.startsWith('YOUR_')) {
          _currentKeyIndex = (_currentKeyIndex + 1) % _apiKeys.length;
          continue;
        }

        print('TTS: Calling ElevenLabs API with key index $_currentKeyIndex for text: "$text"');
        final response = await http.post(
          url,
          headers: {
            'xi-api-key': currentKey,
            'Content-Type': 'application/json',
            'Accept': 'audio/mpeg',
          },
          body: jsonEncode({
            'text': text,
            'model_id': 'eleven_v3',
            'voice_settings': {
              'stability': 0.5,
              'similarity_boost': 0.75,
            }
          }),
        );

        if (response.statusCode == 200) {
          final dir = await getTemporaryDirectory();
          final file = File('${dir.path}/alert.mp3');
          await file.writeAsBytes(response.bodyBytes);
          print('TTS: Audio saved to ${file.path}. Attempting to play...');
          await _audioPlayer.play(DeviceFileSource(file.path));
          print('TTS: Audio playback started.');
          return; // Success, exit
        } else if (response.statusCode == 401 || response.statusCode == 429) {
          print('TTS Error (${response.statusCode}) with key index $_currentKeyIndex: ${response.body}. Trying next key...');
          _currentKeyIndex = (_currentKeyIndex + 1) % _apiKeys.length;
        } else {
          print('TTS Error (${response.statusCode}): ${response.body}');
          break; // Unrecoverable error (e.g. invalid model), stop trying
        }
      }
    } catch (e) {
      print('TTS Exception: $e');
    }
  }
}
