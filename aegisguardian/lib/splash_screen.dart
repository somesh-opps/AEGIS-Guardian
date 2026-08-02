import 'package:flutter/material.dart';
import 'dart:async';
import 'main.dart';
import 'theme.dart';
import 'api_service.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  int _currentStep = 0;

  final List<String> _steps = [
    'Initializing AI Engine',
    'Connecting Campus Nodes',
    'Verifying Safety Network',
    'Connecting to Backend',
  ];

  @override
  void initState() {
    super.initState();
    _startBootSequence();
  }

  void _startBootSequence() async {
    for (int i = 0; i < _steps.length; i++) {
      await Future.delayed(const Duration(milliseconds: 600));
      if (mounted) {
        setState(() {
          _currentStep = i;
        });
      }
    }
    
    // Check backend connectivity for the last step
    bool isConnected = await ApiService.checkBackendConnection();
    if (mounted) {
      setState(() {
        _currentStep = _steps.length;
        if (!isConnected) {
           _steps[_steps.length - 1] = 'Backend Offline - Using Mock Data';
        } else {
           _steps[_steps.length - 1] = 'Backend Connected Successfully';
        }
      });
    }

    // Wait a bit after before navigating
    await Future.delayed(const Duration(seconds: 1));

    if (mounted) {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) => const MyHomePage(title: 'AEGIS Guardian'),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Column(
          children: [
            const Spacer(flex: 2),
            // Glowing Shield Logo
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: AppColors.ai.withOpacity(0.15),
                    blurRadius: 40,
                    spreadRadius: 20,
                  ),
                ],
              ),
              child: const Icon(Icons.shield, size: 50, color: AppColors.ai),
            ),
            const SizedBox(height: 24),
            // AEGIS Title
            const Text(
              'A E G I S',
              style: TextStyle(
                fontSize: 42,
                fontWeight: FontWeight.w900,
                color: Colors.white,
                letterSpacing: 4.0,
              ),
            ),
            // Guardian Subtitle
            const Text(
              'Guardian',
              style: TextStyle(
                fontSize: 32,
                fontWeight: FontWeight.w800,
                color: Color(0xFF8B75FF),
                letterSpacing: 2.0,
              ),
            ),
            const SizedBox(height: 16),
            // Tagline
            Text(
              'AI Emergency Response Platform',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w500,
                color: Colors.grey[400],
                letterSpacing: 0.5,
              ),
            ),
            const SizedBox(height: 48),
            // Boot sequence list
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 48.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  for (int i = 0; i < _steps.length; i++)
                    _buildStepItem(_steps[i], i < _currentStep),
                  const SizedBox(height: 8),
                ],
              ),
            ),
            const Spacer(flex: 3),
            // Footer
            Text(
              'Version 1.0',
              style: TextStyle(color: Colors.grey[600], fontSize: 12),
            ),
            const SizedBox(height: 8),

            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _buildStepItem(String text, bool isCompleted) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16.0),
      child: AnimatedOpacity(
        opacity: isCompleted ? 1.0 : 0.0,
        duration: const Duration(milliseconds: 300),
        child: Row(
          children: [
            const Icon(
              Icons.check_circle,
              color: Color(0xFF10B981), // Emerald green
              size: 20,
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Text(
                text,
                style: TextStyle(
                  color: Colors.grey[300],
                  fontSize: 15,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
