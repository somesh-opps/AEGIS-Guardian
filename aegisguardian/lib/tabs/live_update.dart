import 'dart:math';
import 'package:flutter/material.dart';
import '../theme.dart';
import '../api_service.dart';
import '../tts_service.dart';

class LiveUpdateTab extends StatefulWidget {
  const LiveUpdateTab({super.key});

  @override
  State<LiveUpdateTab> createState() => _LiveUpdateTabState();
}

class _LiveUpdateTabState extends State<LiveUpdateTab>
    with SingleTickerProviderStateMixin {
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  List<dynamic> _nodes = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2000),
    )..repeat(reverse: true);

    _pulseAnimation = Tween<double>(begin: 1.0, end: 1.12).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );

    _loadData();
  }

  Future<void> _loadData() async {
    final nodes = await ApiService.fetchAegisNodes();
    if (mounted) {
      setState(() {
        _nodes = nodes;
        _loading = false;
      });
      _checkAndAnnounceAlerts();
    }
  }

  void _checkAndAnnounceAlerts() {
    final alertNode = _highestAlertNode;
    if (alertNode != null) {
      final color = _statusColor(alertNode);
      final problem = _statusLabel(alertNode);
      final room = alertNode['room'] ?? 'an unknown location';
      
      if (color == AppColors.critical) {
        TtsService.announce('Critical alert! $problem detected in $room. Please evacuate immediately.');
      } else if (color == AppColors.warning) {
        TtsService.announce('Warning. Abnormal $problem levels detected in $room.');
      }
    }
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  Color _statusColor(Map<String, dynamic> node) {
    final env = node['environment'] as Map<String, dynamic>? ?? {};
    final elec = node['electrical'] as Map<String, dynamic>? ?? {};
    final tempLabel = env['temperature_label'] as String? ?? 'NORMAL';
    final smokeLabel = env['smoke_label'] as String? ?? 'LOW';
    final gasLabel = env['gas_label'] as String? ?? 'LOW';
    final currentLabel = elec['current_label'] as String? ?? 'NORMAL';
    final flame = env['flame'] as bool? ?? false;
    final panic = node['panic_button'] as bool? ?? false;

    if (flame || panic || smokeLabel == 'HIGH') return AppColors.critical;
    if (gasLabel == 'HIGH' || currentLabel == 'ABNORMAL' || tempLabel == 'HIGH') {
      return AppColors.warning;
    }
    return AppColors.safe;
  }

  String _statusLabel(Map<String, dynamic> node) {
    final env = node['environment'] as Map<String, dynamic>? ?? {};
    final elec = node['electrical'] as Map<String, dynamic>? ?? {};
    final smokeLabel = env['smoke_label'] as String? ?? 'LOW';
    final gasLabel = env['gas_label'] as String? ?? 'LOW';
    final currentLabel = elec['current_label'] as String? ?? 'NORMAL';
    final tempLabel = env['temperature_label'] as String? ?? 'NORMAL';
    final flame = env['flame'] as bool? ?? false;
    final panic = node['panic_button'] as bool? ?? false;

    if (panic) return 'PANIC';
    if (flame) return 'FLAME';
    if (smokeLabel == 'HIGH') return 'SMOKE';
    if (gasLabel == 'HIGH') return 'GAS';
    if (currentLabel == 'ABNORMAL') return 'ELEC';
    if (tempLabel == 'HIGH') return 'TEMP';
    return 'SAFE';
  }

  Map<String, dynamic>? get _highestAlertNode {
    Map<String, dynamic>? warningNode;
    for (final node in _nodes) {
      final n = node as Map<String, dynamic>;
      final color = _statusColor(n);
      if (color == AppColors.critical) return n;
      if (color == AppColors.warning && warningNode == null) warningNode = n;
    }
    return warningNode;
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Column(
        children: [
          _buildHeader(),
          if (_loading)
            const Expanded(
              child: Center(
                child: CircularProgressIndicator(color: AppColors.safe),
              ),
            )
          else if (_nodes.isEmpty)
            _buildEmptyState()
          else
            Expanded(
              child: RefreshIndicator(
                onRefresh: _loadData,
                color: AppColors.safe,
                backgroundColor: AppColors.card,
                child: ListView.builder(
                  physics: const BouncingScrollPhysics(
                    parent: AlwaysScrollableScrollPhysics(),
                  ),
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  itemCount: _nodes.length + 1,
                  itemBuilder: (ctx, i) {
                    if (i == 0) return _buildSummaryBanner();
                    return _buildNodeCard(
                        _nodes[i - 1] as Map<String, dynamic>);
                  },
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 14, 20, 8),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: const [
                Text(
                  'Live Sensors',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w800,
                    color: Colors.white,
                    letterSpacing: -0.5,
                  ),
                ),
                Text(
                  'Real-time campus telemetry',
                  style: TextStyle(fontSize: 12, color: Colors.white38),
                ),
              ],
            ),
          ),
          GestureDetector(
            onTap: () {
              setState(() => _loading = true);
              _loadData();
            },
            child: Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.ai.withOpacity(0.12),
                border: Border.all(color: AppColors.ai.withOpacity(0.3)),
              ),
              child: const Icon(Icons.refresh_rounded,
                  color: AppColors.ai, size: 20),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryBanner() {
    final alertNode = _highestAlertNode;
    final isDanger = alertNode != null && _statusColor(alertNode) == AppColors.critical;
    final color = isDanger 
        ? AppColors.critical 
        : (alertNode != null ? AppColors.warning : AppColors.safe);
    
    final label = isDanger 
        ? 'DANGER DETECTED' 
        : (alertNode != null ? 'WARNING DETECTED' : 'ALL CLEAR');
        
    final icon = isDanger 
        ? Icons.crisis_alert_rounded 
        : (alertNode != null ? Icons.warning_amber_rounded : Icons.verified_user_rounded);
        
    String subtitle = '${_nodes.length} node${_nodes.length != 1 ? 's' : ''} reporting · Pull to refresh';
    if (alertNode != null) {
      final problem = _statusLabel(alertNode);
      final room = alertNode['room'] ?? 'Unknown Location';
      subtitle = 'Problem: $problem detected in $room';
    }

    return AnimatedBuilder(
      animation: _pulseAnimation,
      builder: (_, child) => Transform.scale(
        scale: alertNode != null ? _pulseAnimation.value : 1.0,
        child: child,
      ),
      child: Container(
        margin: const EdgeInsets.only(bottom: 16),
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(18),
          color: color.withOpacity(0.08),
          border: Border.all(color: color.withOpacity(0.3)),
          boxShadow: [
            BoxShadow(
              color: color.withOpacity(0.08),
              blurRadius: 16,
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: color.withOpacity(0.14),
              ),
              child: Icon(icon, color: color, size: 22),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w800,
                      color: color,
                      letterSpacing: 0.5,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    subtitle,
                    style: TextStyle(
                      fontSize: 11,
                      color: alertNode != null ? color.withOpacity(0.9) : Colors.white38,
                      fontWeight: alertNode != null ? FontWeight.w600 : FontWeight.normal,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Expanded(
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.sensors_off_rounded,
                color: Colors.white12, size: 56),
            const SizedBox(height: 14),
            const Text(
              'No sensor nodes found',
              style: TextStyle(color: Colors.white38, fontSize: 14),
            ),
            const SizedBox(height: 6),
            GestureDetector(
              onTap: _loadData,
              child: const Text(
                'Tap to retry',
                style: TextStyle(color: AppColors.ai, fontSize: 12),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildNodeCard(Map<String, dynamic> node) {
    final nodeId = node['node_id'] as String? ?? 'Unknown';
    final building = node['building'] as String? ?? '--';
    final floor = node['floor'];
    final room = node['room'] as String? ?? '--';
    final env = node['environment'] as Map<String, dynamic>? ?? {};
    final elec = node['electrical'] as Map<String, dynamic>? ?? {};
    final occupancy = node['occupancy'] as Map<String, dynamic>? ?? {};
    final panic = node['panic_button'] as bool? ?? false;

    final statusColor = _statusColor(node);
    final statusLabel = _statusLabel(node);

    final temp = env['temperature'];
    final smoke = env['smoke'];
    final gas = env['gas'];
    final flame = env['flame'];
    final humidity = env['humidity'];
    final current = elec['current'];
    final motion = occupancy['motion'] as bool? ?? false;

    final ts = node['timestamp'] as String? ?? '';
    final timeStr = ts.length >= 16 ? ts.substring(11, 16) : '--';

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: statusColor.withOpacity(0.22), width: 1),
        boxShadow: [
          BoxShadow(
            color: statusColor.withOpacity(0.06),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Card Header ──
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
            child: Row(
              children: [
                Container(
                  width: 38,
                  height: 38,
                  decoration: BoxDecoration(
                    color: statusColor.withOpacity(0.14),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(Icons.sensors_rounded,
                      color: statusColor, size: 20),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        nodeId,
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: Colors.white,
                        ),
                      ),
                      Text(
                        '$building · ${floor != null ? 'Floor $floor' : ''} · $room',
                        style: const TextStyle(
                          fontSize: 10,
                          color: Colors.white38,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: statusColor.withOpacity(0.14),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        statusLabel,
                        style: TextStyle(
                          fontSize: 9,
                          color: statusColor,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      timeStr,
                      style: const TextStyle(
                          fontSize: 9, color: Colors.white24),
                    ),
                  ],
                ),
              ],
            ),
          ),

          Divider(height: 1, color: Colors.white.withOpacity(0.06)),

          // ── Sensor Readings Grid ──
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 10, 12, 14),
            child: Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                if (temp != null)
                  _sensorChip(
                    Icons.thermostat_rounded,
                    '${(temp as num).toStringAsFixed(1)}°C',
                    env['temperature_label'] as String? ?? '',
                  ),
                if (smoke != null)
                  _sensorChip(
                    Icons.cloud_rounded,
                    'Smoke: $smoke',
                    env['smoke_label'] as String? ?? '',
                  ),
                if (gas != null)
                  _sensorChip(
                    Icons.air_rounded,
                    'Gas: $gas ppm',
                    env['gas_label'] as String? ?? '',
                  ),
                if (humidity != null)
                  _sensorChip(
                    Icons.water_drop_rounded,
                    '${(humidity as num).toStringAsFixed(1)}%',
                    env['humidity_label'] as String? ?? 'NORMAL',
                  ),
                if (current != null)
                  _sensorChip(
                    Icons.electric_bolt_rounded,
                    '${(current as num).toStringAsFixed(2)} A',
                    elec['current_label'] as String? ?? '',
                  ),
                _sensorChip(
                  motion
                      ? Icons.directions_run_rounded
                      : Icons.person_off_rounded,
                  motion ? 'Motion' : 'No Motion',
                  motion ? 'DETECTED' : 'CLEAR',
                ),
                if (flame != null)
                  _sensorChip(
                    Icons.local_fire_department_rounded,
                    flame == true ? 'FLAME' : 'No Flame',
                    flame == true ? 'HIGH' : 'LOW',
                  ),
                if (panic)
                  _sensorChip(
                    Icons.sos_rounded,
                    'PANIC',
                    'HIGH',
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _sensorChip(IconData icon, String label, String levelLabel) {
    Color chipColor;
    if (levelLabel == 'HIGH' || levelLabel == 'ABNORMAL' ||
        levelLabel == 'DETECTED' || levelLabel == 'FLAME') {
      chipColor = AppColors.critical;
    } else if (levelLabel == 'WARN') {
      chipColor = AppColors.warning;
    } else {
      chipColor = Colors.white24;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: chipColor.withOpacity(0.08),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: chipColor.withOpacity(0.2), width: 1),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 13, color: chipColor),
          const SizedBox(width: 5),
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              color: chipColor == Colors.white24 ? Colors.white54 : chipColor,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}
