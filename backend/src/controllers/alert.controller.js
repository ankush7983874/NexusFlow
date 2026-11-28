import { Alert } from '../models/alert.model.js';
import { broadcastAlertUpdate } from '../sockets/socketManager.js';
import { ruleEngine } from '../services/ruleEngine.service.js';

export class AlertController {
  static async listAlerts(req, res, next) {
    try {
      const { 
        severity, 
        status, 
        deviceId, 
        search, 
        acknowledged, 
        limit = 50, 
        page = 1 
      } = req.query;

      const filter = {};

      if (severity && severity !== 'all') {
        filter.severity = severity.toLowerCase();
      }

      if (status && status !== 'all') {
        filter.status = status.toLowerCase();
      } else if (acknowledged !== undefined && !status) {
        filter.acknowledged = acknowledged === 'true';
      }

      if (deviceId && deviceId !== 'all') {
        filter.deviceId = String(deviceId).trim().toUpperCase();
      }

      if (search && String(search).trim()) {
        const regex = new RegExp(String(search).trim(), 'i');
        filter.$or = [
          { title: regex },
          { message: regex },
          { ruleName: regex },
          { deviceId: regex },
          { deviceName: regex },
          { metric: regex }
        ];
      }

      const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 500);
      const safePage = Math.max(Number(page) || 1, 1);
      const skip = (safePage - 1) * safeLimit;

      const [alerts, totalCount] = await Promise.all([
        Alert.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(safeLimit)
          .lean(),
        Alert.countDocuments(filter)
      ]);

      res.status(200).json({
        success: true,
        data: alerts,
        totalCount,
        page: safePage,
        totalPages: Math.ceil(totalCount / safeLimit)
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAlertById(req, res, next) {
    try {
      const alert = await Alert.findById(req.params.id).lean();
      if (!alert) {
        return res.status(404).json({ success: false, message: 'Alert not found' });
      }

      res.status(200).json({
        success: true,
        data: alert
      });
    } catch (error) {
      next(error);
    }
  }

  static async acknowledgeAlert(req, res, next) {
    try {
      const alert = await Alert.findByIdAndUpdate(
        req.params.id,
        { 
          status: 'acknowledged',
          acknowledged: true,
          acknowledgedAt: new Date()
        },
        { new: true }
      );

      if (!alert) {
        return res.status(404).json({ success: false, message: 'Alert not found' });
      }

      const alertObj = alert.toObject();
      broadcastAlertUpdate(alertObj);

      res.status(200).json({
        success: true,
        message: 'Alert acknowledged successfully',
        data: alertObj
      });
    } catch (error) {
      next(error);
    }
  }

  static async resolveAlert(req, res, next) {
    try {
      const alert = await Alert.findByIdAndUpdate(
        req.params.id,
        { 
          status: 'resolved',
          acknowledged: true,
          resolvedAt: new Date()
        },
        { new: true }
      );

      if (!alert) {
        return res.status(404).json({ success: false, message: 'Alert not found' });
      }

      // Clear from in-memory duplicate tracker so that if condition becomes abnormal again, a new alert is generated
      ruleEngine.clearAlertTracker(alert.ruleId, alert.deviceId);

      const alertObj = alert.toObject();
      broadcastAlertUpdate(alertObj);

      res.status(200).json({
        success: true,
        message: 'Alert resolved successfully',
        data: alertObj
      });
    } catch (error) {
      next(error);
    }
  }

  static async clearAlerts(req, res, next) {
    try {
      await Alert.deleteMany({});
      res.status(200).json({
        success: true,
        message: 'All alerts cleared'
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAlertStats(req, res, next) {
    try {
      const [
        totalActive,
        criticalActive,
        warningActive,
        resolvedTotal,
        acknowledgedTotal,
        total
      ] = await Promise.all([
        Alert.countDocuments({ status: 'active' }),
        Alert.countDocuments({ status: { $ne: 'resolved' }, severity: 'critical' }),
        Alert.countDocuments({ status: { $ne: 'resolved' }, severity: 'warning' }),
        Alert.countDocuments({ status: 'resolved' }),
        Alert.countDocuments({ status: 'acknowledged' }),
        Alert.countDocuments()
      ]);

      res.status(200).json({
        success: true,
        data: {
          active: totalActive,
          critical: criticalActive,
          warning: warningActive,
          resolved: resolvedTotal,
          acknowledged: acknowledgedTotal,
          total
        }
      });
    } catch (error) {
      next(error);
    }
  }
}
