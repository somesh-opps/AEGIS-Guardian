import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter/foundation.dart';


class ApiService {
  // Backend server LAN IP — update this if your machine's IP changes.
  static const String _lanIp = '10.12.53.180';

  static String get baseUrl {
    if (kIsWeb) return 'http://127.0.0.1:5000';
    // Physical Android device: use real LAN IP of the host machine
    return 'http://$_lanIp:5000';
  }

  static Future<bool> checkBackendConnection() async {
    try {
      final response = await http.get(Uri.parse('$baseUrl/')).timeout(
        const Duration(seconds: 3),
      );
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return data['success'] == true;
      }
      return false;
    } catch (e) {
      debugPrint('Backend connection error: $e');
      return false;
    }
  }

  // ─── Legacy endpoints ────────────────────────────────────────────────────
  static Future<Map<String, dynamic>?> fetchHomeData() async {
    return _fetchMap('/api/home');
  }

  static Future<Map<String, dynamic>?> fetchSosData() async {
    return _fetchMap('/api/sos');
  }

  static Future<Map<String, dynamic>?> fetchLiveData() async {
    return _fetchMap('/api/live');
  }

  // ─── AEGIS real sensor data ───────────────────────────────────────────────

  /// Latest fused sensor reading for each node (from aegis_db.fused_readings)
  static Future<List<dynamic>> fetchAegisNodes() async {
    return _fetchList('/api/aegis/nodes');
  }

  /// Campus status for all buildings (from aegis_db.campus_status)
  static Future<List<dynamic>> fetchAegisCampus() async {
    return _fetchList('/api/aegis/campus');
  }

  /// All incidents sorted newest-first (from aegis_db.incidents)
  static Future<List<dynamic>> fetchAegisIncidents() async {
    return _fetchList('/api/aegis/incidents');
  }

  // ─── Chat ────────────────────────────────────────────────────────────────
  static Future<String?> sendChatMessage(String message) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/chat'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({'message': message}),
      ).timeout(const Duration(seconds: 60));
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data['success'] == true) {
          return data['reply'];
        } else {
          return data['error'] ?? 'Unknown error occurred.';
        }
      }
      return 'Server returned status code: ${response.statusCode}';
    } catch (e) {
      debugPrint('Error sending chat message: $e');
      return 'Connection error: Could not reach the server.';
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────
  static Future<Map<String, dynamic>?> _fetchMap(String endpoint) async {
    try {
      final response = await http.get(Uri.parse('$baseUrl$endpoint')).timeout(
        const Duration(seconds: 5),
      );
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data['success'] == true) {
          return data['data'];
        }
      }
      return null;
    } catch (e) {
      debugPrint('Error fetching $endpoint: $e');
      return null;
    }
  }

  static Future<List<dynamic>> _fetchList(String endpoint) async {
    try {
      final response = await http.get(Uri.parse('$baseUrl$endpoint')).timeout(
        const Duration(seconds: 8),
      );
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data['success'] == true && data['data'] is List) {
          return data['data'] as List<dynamic>;
        }
      }
      return [];
    } catch (e) {
      debugPrint('Error fetching $endpoint: $e');
      return [];
    }
  }
}
