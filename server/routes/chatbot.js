const express  = require('express');
const router   = express.Router();
const { protect } = require('../middleware/auth');
const Equipment    = require('../models/Equipment');
const Alert        = require('../models/Alert');
const SensorReading = require('../models/SensorReading');

// POST /api/chat
router.post('/', protect, async (req, res) => {
  try {
    const { message, context } = req.body;
    if (!message) return res.status(400).json({ success: false, error: 'Message required' });

    // ── Gather live context from DB ──────────────────────────────────
    let dbContext = '';
    let equipmentList = [];
    try {
      const [equipment, alerts, readings] = await Promise.all([
        Equipment.find({}).limit(20).lean(),
        Alert.find({ acknowledged: false }).sort({ createdAt: -1 }).limit(10).populate('equipmentId', 'name').lean(),
        SensorReading.find({}).sort({ timestamp: -1 }).limit(20).lean(),
      ]);

      equipmentList = equipment;
      const criticalEquip = equipment.filter(e => e.status === 'critical');
      const warningEquip  = equipment.filter(e => e.status === 'warning');
      const healthyEquip  = equipment.filter(e => e.status === 'healthy');
      const avgHealth = readings.length
        ? Math.round(readings.reduce((s, r) => s + (r.healthScore || 0), 0) / readings.length)
        : (equipment.length ? Math.round(equipment.reduce((s,e) => s+(e.healthScore||100),0)/equipment.length) : 'N/A');

      dbContext = `
=== LIVE SYSTEM STATUS (${new Date().toLocaleString()}) ===
Fleet Overview:
  - Total equipment: ${equipment.length}
  - Healthy: ${healthyEquip.length} | Warning: ${warningEquip.length} | Critical: ${criticalEquip.length}
  - Average fleet health: ${avgHealth}%
  - Active unacknowledged alerts: ${alerts.length}

Critical Machines: ${criticalEquip.length > 0 ? criticalEquip.map(e => `${e.name} (health: ${e.healthScore}%, failure risk: ${e.failureProbability}%)`).join(', ') : 'NONE'}
Warning Machines: ${warningEquip.length > 0 ? warningEquip.map(e => `${e.name} (health: ${e.healthScore}%)`).join(', ') : 'NONE'}

Recent Critical Alerts: ${alerts.filter(a => a.severity === 'critical').slice(0, 5).map(a => `[${a.equipmentId?.name}] ${a.message}`).join(' | ') || 'None'}
${context?.equipmentName ? `\n=== FOCUSED MACHINE ===\nName: ${context.equipmentName}\nHealth: ${context.healthScore}% | Failure Risk: ${context.failureProbability}%\nTemperature: ${context.temperature?.toFixed(1)}°C | Vibration: ${context.vibration?.toFixed(2)} mm/s` : ''}`;
    } catch (_) {}

    const apiKey = process.env.OPENAI_API_KEY || '';

    // ── OpenAI GPT-4o-mini integration ──────────────────────────────
    if (apiKey) {
      try {
        const OpenAI = require('openai');
        const client = new OpenAI.default({ apiKey });

        const completion = await client.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are an expert AI Predictive Maintenance Assistant for an industrial factory. You have real-time access to machine sensor data and provide actionable maintenance insights.

Your expertise covers:
- Predictive & preventive maintenance strategies  
- Industrial IoT sensors: temperature, vibration, pressure, RPM, current, humidity
- Failure mode analysis (FMEA) and root cause analysis
- Equipment types: pumps, motors, turbines, compressors, conveyors, boilers, CNC machines, generators
- Standards: ISO 13374, ISO 55000, ISO 10816 (vibration), IEC 62443

${dbContext}

Response Guidelines:
- Be concise yet actionable. Use bullet points.
- Reference specific real machine names and data from the system when available.
- Assign urgency: 🔴 CRITICAL (act now), 🟡 WARNING (act within 48h), 🟢 INFO (monitor).
- For critical machines always recommend immediate shutdown/inspection if needed.
- Keep responses under 300 words unless a detailed analysis is requested.
- Use emojis sparingly for readability.`,
            },
            { role: 'user', content: message },
          ],
          max_tokens: 500,
          temperature: 0.65,
        });

        const reply = completion.choices[0]?.message?.content || 'Unable to generate response.';
        return res.json({ success: true, reply, aiEnabled: true, model: 'gpt-4o-mini' });
      } catch (aiErr) {
        console.error('OpenAI error:', aiErr.message);
        // Fall through to rule-based fallback
      }
    }

    // ── Rule-based fallback ─────────────────────────────────────────
    const lower = message.toLowerCase();
    const critical = equipmentList.filter(e => e.status === 'critical');
    const warning  = equipmentList.filter(e => e.status === 'warning');

    let reply;

    if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
      reply = `👋 Hello! I'm your **AI Predictive Maintenance Assistant**.\n\nI can help you with:\n• 📊 Fleet health status & KPIs\n• 🚨 Critical alerts & anomalies\n• 🔮 Failure predictions & risk assessment\n• 🔧 Maintenance scheduling recommendations\n• 🌡️ Sensor data analysis\n\nWhat would you like to know?`;
    } else if (lower.includes('critical') || lower.includes('urgent') || lower.includes('emergency')) {
      reply = critical.length > 0
        ? `🔴 **${critical.length} CRITICAL MACHINE(S) DETECTED:**\n\n${critical.map(e => `• **${e.name}** — Health: ${e.healthScore}% | Risk: ${e.failureProbability}%`).join('\n')}\n\n⚡ **Immediate actions required:**\n• Dispatch maintenance team NOW\n• Consider controlled shutdown if safe\n• Check temperature, vibration, and pressure sensors\n• Document anomalies for root-cause analysis`
        : `✅ No critical machines detected at this time.\n\n${warning.length > 0 ? `⚠️ However, ${warning.length} machine(s) are in WARNING state:\n${warning.map(e => `• ${e.name} (${e.healthScore}% health)`).join('\n')}\n\nSchedule inspections within 48 hours.` : 'All equipment currently operating within normal parameters.'}`;
    } else if (lower.includes('health') || lower.includes('fleet') || lower.includes('status') || lower.includes('overview')) {
      const avgH = equipmentList.length ? Math.round(equipmentList.reduce((s,e)=>s+(e.healthScore||100),0)/equipmentList.length) : 0;
      reply = `📊 **Fleet Health Overview:**\n\n• Total Equipment: ${equipmentList.length}\n• Average Health: **${avgH}%**\n• 🟢 Healthy: ${equipmentList.filter(e=>e.status==='healthy').length}\n• 🟡 Warning: ${warning.length}\n• 🔴 Critical: ${critical.length}\n\n${avgH >= 80 ? '✅ Fleet is in good condition overall.' : avgH >= 60 ? '⚠️ Fleet health is declining — proactive maintenance recommended.' : '🔴 Fleet health is low — immediate intervention required!'}`;
    } else if (lower.includes('failure') || lower.includes('predict') || lower.includes('risk')) {
      const highRisk = equipmentList.filter(e => (e.failureProbability || 0) > 60).sort((a,b) => b.failureProbability - a.failureProbability);
      reply = `🔮 **Failure Prediction Analysis:**\n\n${highRisk.length > 0 ? `High-risk machines (>60% failure probability):\n${highRisk.slice(0,5).map(e=>`• **${e.name}**: ${e.failureProbability}% risk | Health: ${e.healthScore}%`).join('\n')}\n\nRecommendation: Schedule immediate inspection for all high-risk units.` : '✅ No machines currently exceeding 60% failure probability.'}\n\nKey failure indicators to monitor:\n• Temperature spikes > 85°C\n• Vibration > 7.1 mm/s (ISO 10816)\n• Abnormal current draw`;
    } else if (lower.includes('maintenance') || lower.includes('service') || lower.includes('schedule')) {
      reply = `🔧 **Maintenance Recommendations:**\n\n${critical.length > 0 ? `🔴 URGENT (Act Now):\n${critical.map(e=>`• ${e.name} — immediate inspection`).join('\n')}\n\n` : ''}${warning.length > 0 ? `🟡 HIGH (Within 48h):\n${warning.map(e=>`• ${e.name} — service required`).join('\n')}\n\n` : ''}🟢 PREVENTIVE (Monthly):\n• Lubricate all bearings\n• Check belt tension & alignment\n• Inspect seals and gaskets\n• Calibrate sensors\n• Clean cooling systems`;
    } else if (lower.includes('temperature') || lower.includes('temp') || lower.includes('heat')) {
      reply = `🌡️ **Temperature Analysis:**\n\nSafe operating thresholds:\n• < 60°C — Excellent\n• 60–75°C — Normal\n• 75–85°C — 🟡 Monitor (check cooling)\n• > 85°C — 🔴 CRITICAL (reduce load/shutdown)\n\n${context?.temperature != null ? `Current reading: **${context.temperature?.toFixed(1)}°C**\nStatus: ${context.temperature > 85 ? '🔴 CRITICAL — Take immediate action!' : context.temperature > 75 ? '🟡 Warning — Check cooling system.' : '🟢 Normal operation.'}` : 'Check the sensor readings panel for real-time temperature data of specific machines.'}`;
    } else if (lower.includes('vibration') || lower.includes('vib') || lower.includes('bearing')) {
      reply = `📳 **Vibration Analysis (ISO 10816):**\n\n• 0–2.3 mm/s — Excellent\n• 2.3–4.5 mm/s — Good\n• 4.5–7.1 mm/s — Acceptable (monitor)\n• > 7.1 mm/s — 🔴 Unacceptable (stop machine)\n\n${context?.vibration != null ? `Current: **${context.vibration?.toFixed(2)} mm/s**\nStatus: ${context.vibration > 7.1 ? '🔴 STOP machine — check bearings & mounts.' : context.vibration > 4.5 ? '🟡 Monitor closely — schedule bearing inspection.' : '🟢 Within normal range.'}` : 'High vibration often indicates: bearing wear, misalignment, imbalance, or looseness.'}`;
    } else if (lower.includes('alert') || lower.includes('alarm') || lower.includes('notification')) {
      reply = `🚨 **Alert Management Guide:**\n\n• 🔴 **Critical alerts** — Respond within 1 hour. Risk of equipment damage or safety hazard.\n• 🟡 **Warning alerts** — Respond within 24–48 hours. Equipment degradation detected.\n• 🔵 **Info alerts** — Review and log. No immediate action required.\n\nTip: Visit the **Alerts page** to acknowledge and track all active alerts. Unacknowledged critical alerts require priority action!`;
    } else {
      reply = `🤖 I'm your AI Predictive Maintenance Assistant.\n\nYou can ask me about:\n• Equipment health & fleet status\n• Critical alerts & failure predictions\n• Vibration, temperature, pressure analysis\n• Maintenance scheduling & recommendations\n• Specific machine performance\n\n💡 *Tip: Add your OpenAI API key for full AI-powered responses with natural language understanding.*`;
    }

    return res.json({ success: true, reply, aiEnabled: false });
  } catch (err) {
    console.error('Chatbot error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
