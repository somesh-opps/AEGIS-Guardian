import 'dart:math';
import 'package:flutter/material.dart';
import '../theme.dart';
import '../api_service.dart';

class HomeTab extends StatefulWidget {
  const HomeTab({super.key});

  @override
  State<HomeTab> createState() => _HomeTabState();
}

class _HomeTabState extends State<HomeTab> with TickerProviderStateMixin {
  late AnimationController _pulseController;
  late AnimationController _scanlineController;
  late Animation<double> _pulseAnim;
  late Animation<double> _scanlineAnim;

  List<dynamic> _campusStatus = [];
  List<dynamic> _incidents = [];
  List<dynamic> _nodes = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();

    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1600),
    )..repeat(reverse: true);

    _scanlineController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2800),
    )..repeat();

    _pulseAnim = Tween<double>(begin: 0.6, end: 1.0).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );

    _scanlineAnim = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(parent: _scanlineController, curve: Curves.linear),
    );

    _loadData();
  }

  Future<void> _loadData() async {
    final results = await Future.wait([
      ApiService.fetchAegisCampus(),
      ApiService.fetchAegisIncidents(),
      ApiService.fetchAegisNodes(),
    ]);
    if (mounted) {
      setState(() {
        _campusStatus = results[0];
        _incidents = results[1];
        _nodes = results[2];
        _loading = false;
      });
    }
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _scanlineController.dispose();
    super.dispose();
  }

  // ── Derived KPI helpers ────────────────────────────────────────────────────
  bool get _hasWarning => _campusStatus.any((b) => b['status'] != 'SAFE');

  int get _activeIncidents =>
      _incidents.where((i) => i['status'] == 'ACTIVE').length;

  double get _avgTemp {
    if (_nodes.isEmpty) return 0;
    final temps = _nodes
        .map((n) => (n['environment']?['temperature'] as num?)?.toDouble() ?? 0.0)
        .toList();
    return temps.reduce((a, b) => a + b) / temps.length;
  }

  int get _motionDetected =>
      _nodes.where((n) => n['occupancy']?['motion'] == true).length;

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(
        child: CircularProgressIndicator(color: AppColors.safe),
      );
    }

    return SafeArea(
      child: RefreshIndicator(
        onRefresh: _loadData,
        color: AppColors.safe,
        backgroundColor: AppColors.card,
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 100),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildHeader(),
              const SizedBox(height: 20),
              _buildStatusCard(),
              const SizedBox(height: 16),
              _buildKpiGrid(),
              const SizedBox(height: 20),
              _buildBuildingStatus(),
              const SizedBox(height: 20),
              _buildActivityFeed(),
            ],
          ),
        ),
      ),
    );
  }

  // ─── Header ────────────────────────────────────────────────────────────────
  Widget _buildHeader() {
    return Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'AEGIS Guardian',
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.w800,
                  color: Colors.white,
                  letterSpacing: -0.5,
                ),
              ),
            ],
          ),
        ),
        // Refresh + Alert bell
        GestureDetector(
          onTap: () {
            setState(() => _loading = true);
            _loadData();
          },
          child: Stack(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: LinearGradient(
                    colors: [
                      AppColors.ai.withOpacity(0.3),
                      AppColors.ai.withOpacity(0.08),
                    ],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  border: Border.all(
                    color: AppColors.ai.withOpacity(0.35),
                    width: 1,
                  ),
                ),
                child: const Icon(
                  Icons.notifications_rounded,
                  color: AppColors.ai,
                  size: 22,
                ),
              ),
              if (_activeIncidents > 0)
                Positioned(
                  top: 8,
                  right: 8,
                  child: Container(
                    width: 9,
                    height: 9,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: AppColors.critical,
                      border: Border.all(color: AppColors.background, width: 1.5),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }

  // ─── Campus Status Card ───────────────────────────────────────────────────
  Widget _buildStatusCard() {
    final overallStatus = _hasWarning ? 'WARNING' : 'ALL CLEAR';
    final statusColor = _hasWarning ? AppColors.warning : AppColors.safe;
    final subtitle = _hasWarning
        ? '${_activeIncidents} active incident${_activeIncidents != 1 ? 's' : ''} detected'
        : 'All systems operating normally';

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: _hasWarning
              ? [const Color(0xFF2B1A00), const Color(0xFF1A0F00)]
              : [const Color(0xFF0D2B1F), const Color(0xFF0B1A14)],
        ),
        border: Border.all(
          color: statusColor.withOpacity(0.28),
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: statusColor.withOpacity(0.10),
            blurRadius: 24,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'CAMPUS STATUS',
                    style: TextStyle(
                      fontSize: 11,
                      color: Colors.white38,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 2,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      AnimatedBuilder(
                        animation: _pulseAnim,
                        builder: (_, __) => Container(
                          width: 10,
                          height: 10,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: statusColor,
                            boxShadow: [
                              BoxShadow(
                                color: statusColor.withOpacity(
                                  _pulseAnim.value * 0.8,
                                ),
                                blurRadius: 10,
                                spreadRadius: 3,
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Text(
                        overallStatus,
                        style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                          color: statusColor,
                          letterSpacing: 1.5,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    subtitle,
                    style: TextStyle(fontSize: 12, color: Colors.white54),
                  ),
                ],
              ),
              _buildRadarWidget(statusColor),
            ],
          ),
          const SizedBox(height: 18),
          Container(height: 1, color: Colors.white10),
          const SizedBox(height: 14),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildMiniStat(
                'Buildings',
                '${_campusStatus.length}',
                statusColor,
              ),
              _buildMiniStatDivider(),
              _buildMiniStat(
                'Incidents',
                '$_activeIncidents',
                _activeIncidents > 0 ? AppColors.critical : AppColors.safe,
              ),
              _buildMiniStatDivider(),
              _buildMiniStat(
                'Nodes',
                '${_nodes.length}',
                AppColors.ai,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildRadarWidget(Color color) {
    return SizedBox(
      width: 68,
      height: 68,
      child: AnimatedBuilder(
        animation: _scanlineAnim,
        builder: (_, __) {
          return CustomPaint(
            painter: _RadarPainter(_scanlineAnim.value, color),
          );
        },
      ),
    );
  }

  Widget _buildMiniStat(String label, String value, Color color) {
    return Column(
      children: [
        Text(
          value,
          style: TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w700,
            color: color,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: const TextStyle(
            fontSize: 10,
            color: Colors.white38,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }

  Widget _buildMiniStatDivider() {
    return Container(width: 1, height: 28, color: Colors.white10);
  }

  // ─── KPI Grid ─────────────────────────────────────────────────────────────
  Widget _buildKpiGrid() {
    // Pick a representative node reading
    final nodeA = _nodes.isNotEmpty ? _nodes[0] : null;
    final nodeB = _nodes.length > 1 ? _nodes[1] : null;

    final tempVal = nodeA != null
        ? '${(nodeA['environment']?['temperature'] as num?)?.toStringAsFixed(1) ?? '--'}°C'
        : '--';
    final tempLabel = nodeA?['environment']?['temperature_label'] ?? '';
    final tempBadge = tempLabel.isNotEmpty ? tempLabel : 'N/A';
    final tempColor = tempLabel == 'HIGH'
        ? AppColors.critical
        : tempLabel == 'NORMAL'
            ? AppColors.safe
            : AppColors.warning;

    final gasVal = nodeA != null
        ? '${(nodeA['environment']?['gas'] as num?) ?? '--'} ppm'
        : '--';
    final gasLabel = nodeA?['environment']?['gas_label'] ?? '';
    final gasColor = gasLabel == 'HIGH'
        ? AppColors.critical
        : gasLabel == 'LOW'
            ? AppColors.safe
            : AppColors.warning;

    final smokeVal = nodeB != null
        ? '${(nodeB['environment']?['smoke'] as num?) ?? '--'}'
        : '--';
    final smokeLabel = nodeB?['environment']?['smoke_label'] ?? '';
    final smokeColor = smokeLabel == 'HIGH'
        ? AppColors.critical
        : AppColors.safe;

    final currentVal = nodeA != null
        ? '${(nodeA['electrical']?['current'] as num?)?.toStringAsFixed(1) ?? '--'} A'
        : '--';
    final currentLabel = nodeA?['electrical']?['current_label'] ?? '';
    final currentColor = currentLabel == 'ABNORMAL'
        ? AppColors.critical
        : AppColors.safe;

    final cards = [
      _KpiData(
        'Temperature',
        tempVal,
        Icons.thermostat_rounded,
        tempColor,
        tempBadge,
        nodeA?['room'] ?? 'Node A1',
      ),
      _KpiData(
        'Gas Level',
        gasVal,
        Icons.air_rounded,
        gasColor,
        gasLabel.isNotEmpty ? gasLabel : 'N/A',
        nodeA?['room'] ?? 'Node A1',
      ),
      _KpiData(
        'Smoke',
        smokeVal,
        Icons.cloud_rounded,
        smokeColor,
        smokeLabel.isNotEmpty ? smokeLabel : 'N/A',
        nodeB?['room'] ?? 'Node B1',
      ),
      _KpiData(
        'Current',
        currentVal,
        Icons.electric_bolt_rounded,
        currentColor,
        currentLabel.isNotEmpty ? currentLabel : 'N/A',
        nodeA?['room'] ?? 'Node A1',
      ),
    ];

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 14,
        mainAxisSpacing: 14,
        childAspectRatio: 1.25,
      ),
      itemCount: cards.length,
      itemBuilder: (ctx, i) => _buildKpiCard(cards[i]),
    );
  }

  Widget _buildKpiCard(_KpiData data) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: data.color.withOpacity(0.18), width: 1),
        boxShadow: [
          BoxShadow(
            color: data.color.withOpacity(0.08),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: data.color.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(data.icon, color: data.color, size: 16),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                decoration: BoxDecoration(
                  color: data.color.withOpacity(0.10),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  data.badge,
                  style: TextStyle(
                    fontSize: 9,
                    color: data.color,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                data.value,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                data.label,
                style: const TextStyle(
                  fontSize: 11,
                  color: Colors.white38,
                  fontWeight: FontWeight.w500,
                ),
              ),
              Text(
                data.source,
                style: TextStyle(
                  fontSize: 9,
                  color: Colors.white24,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ─── Building Status Row ──────────────────────────────────────────────────
  Widget _buildBuildingStatus() {
    if (_campusStatus.isEmpty) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Building Status',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w700,
            color: Colors.white,
          ),
        ),
        const SizedBox(height: 10),
        ...(_campusStatus.map((b) => _buildBuildingCard(b)).toList()),
      ],
    );
  }

  Widget _buildBuildingCard(Map<String, dynamic> b) {
    final status = b['status'] as String? ?? 'SAFE';
    final isWarning = status != 'SAFE';
    final color = isWarning ? AppColors.warning : AppColors.safe;
    final icon = isWarning ? Icons.warning_amber_rounded : Icons.verified_user_rounded;
    final activeIncident = b['active_incident'];
    final lastUpdated = b['last_updated'] as String? ?? '';
    final timeStr = lastUpdated.isNotEmpty
        ? lastUpdated.substring(11, 16) // HH:mm
        : '--';

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withOpacity(0.2), width: 1),
      ),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: color.withOpacity(0.12),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: color, size: 18),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  b['building'] as String? ?? 'Unknown',
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  activeIncident != null
                      ? 'Active: $activeIncident'
                      : 'No active incidents',
                  style: TextStyle(
                    fontSize: 10,
                    color: activeIncident != null
                        ? AppColors.critical.withOpacity(0.8)
                        : Colors.white38,
                  ),
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  status,
                  style: TextStyle(
                    fontSize: 10,
                    color: color,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.5,
                  ),
                ),
              ),
              const SizedBox(height: 4),
              Text(
                timeStr,
                style: const TextStyle(fontSize: 9, color: Colors.white24),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ─── Activity Feed (from incidents) ──────────────────────────────────────
  Widget _buildActivityFeed() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Text(
              'Recent Incidents',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: Colors.white,
              ),
            ),
            if (_incidents.isNotEmpty) ...[
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: AppColors.critical.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  '${_incidents.length}',
                  style: const TextStyle(
                    fontSize: 10,
                    color: AppColors.critical,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ],
        ),
        const SizedBox(height: 12),
        if (_incidents.isEmpty)
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppColors.card,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Colors.white.withOpacity(0.06)),
            ),
            child: const Center(
              child: Text(
                'No incidents recorded',
                style: TextStyle(color: Colors.white38, fontSize: 13),
              ),
            ),
          )
        else
          Container(
            decoration: BoxDecoration(
              color: AppColors.card,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Colors.white.withOpacity(0.06)),
            ),
            child: Column(
              children: List.generate(_incidents.length, (i) {
                final inc = _incidents[i] as Map<String, dynamic>;
                final isLast = i == _incidents.length - 1;
                final incType = inc['incident_type'] as String? ?? 'Unknown';
                final building = inc['building'] as String? ?? '';
                final room = inc['room'] as String? ?? '';
                final status = inc['status'] as String? ?? 'UNKNOWN';
                final ts = inc['timestamp'] as String? ?? '';
                final timeStr = ts.length >= 16 ? ts.substring(11, 16) : '--';
                final severity =
                    inc['ai_analysis']?['incident']?['severity'] as String? ??
                        'Low';

                Color incColor;
                IconData incIcon;
                if (incType.toLowerCase().contains('flame') ||
                    incType.toLowerCase().contains('fire')) {
                  incColor = AppColors.critical;
                  incIcon = Icons.local_fire_department_rounded;
                } else if (incType.toLowerCase().contains('gas')) {
                  incColor = AppColors.warning;
                  incIcon = Icons.air_rounded;
                } else {
                  incColor = const Color(0xFF5B8BFF);
                  incIcon = Icons.warning_amber_rounded;
                }

                return Column(
                  children: [
                    Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 13,
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 36,
                            height: 36,
                            decoration: BoxDecoration(
                              color: incColor.withOpacity(0.12),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Icon(incIcon, color: incColor, size: 17),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  incType,
                                  style: const TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                    color: Colors.white,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  '$building · $room',
                                  style: const TextStyle(
                                    fontSize: 10,
                                    color: Colors.white38,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text(
                                timeStr,
                                style: const TextStyle(
                                  fontSize: 9,
                                  color: Colors.white24,
                                ),
                              ),
                              const SizedBox(height: 3),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: status == 'ACTIVE'
                                      ? AppColors.critical.withOpacity(0.12)
                                      : Colors.white.withOpacity(0.06),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  status,
                                  style: TextStyle(
                                    fontSize: 8,
                                    color: status == 'ACTIVE'
                                        ? AppColors.critical
                                        : Colors.white38,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    if (!isLast)
                      Divider(
                        height: 1,
                        indent: 64,
                        endIndent: 16,
                        color: Colors.white.withOpacity(0.05),
                      ),
                  ],
                );
              }),
            ),
          ),
      ],
    );
  }
}

// ─── Data Models ──────────────────────────────────────────────────────────────
class _KpiData {
  final String label, value, badge, source;
  final IconData icon;
  final Color color;
  const _KpiData(
      this.label, this.value, this.icon, this.color, this.badge, this.source);
}

// ─── Custom Painters ──────────────────────────────────────────────────────────

class _RadarPainter extends CustomPainter {
  final double progress;
  final Color color;
  _RadarPainter(this.progress, this.color);

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2;

    final ringPaint = Paint()
      ..color = color.withOpacity(0.12)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1;

    for (var i = 1; i <= 3; i++) {
      canvas.drawCircle(center, radius * i / 3, ringPaint);
    }

    final hairPaint = Paint()
      ..color = color.withOpacity(0.12)
      ..strokeWidth = 1;
    canvas.drawLine(
        Offset(center.dx, 0), Offset(center.dx, size.height), hairPaint);
    canvas.drawLine(
        Offset(0, center.dy), Offset(size.width, center.dy), hairPaint);

    final sweepAngle = progress * 2 * pi;
    final sweepPaint = Paint()
      ..shader = SweepGradient(
        startAngle: sweepAngle - 0.9,
        endAngle: sweepAngle,
        colors: [Colors.transparent, color.withOpacity(0.55)],
        transform: GradientRotation(sweepAngle - 0.9),
      ).createShader(Rect.fromCircle(center: center, radius: radius))
      ..style = PaintingStyle.fill;

    canvas.drawCircle(center, radius * 0.95, sweepPaint);

    final linePaint = Paint()
      ..color = color.withOpacity(0.8)
      ..strokeWidth = 1.5
      ..strokeCap = StrokeCap.round;

    canvas.drawLine(
      center,
      Offset(
        center.dx + (radius * 0.92) * cos(sweepAngle),
        center.dy + (radius * 0.92) * sin(sweepAngle),
      ),
      linePaint,
    );

    final blipPaint = Paint()..color = color;
    canvas.drawCircle(
      Offset(center.dx + radius * 0.45, center.dy - radius * 0.28),
      3,
      blipPaint,
    );
  }

  @override
  bool shouldRepaint(_RadarPainter old) =>
      old.progress != progress || old.color != color;
}
