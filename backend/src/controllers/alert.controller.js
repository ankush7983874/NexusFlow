import { Alert } from '../models/alert.model.js';

export class AlertController {
  static async listAlerts(req, res, next) {
    try {
      const { severity, acknowledged, limit = 50, page = 1 } = req.query;
      const filter = {};
      if (severity && severity !== 'all') filter.severity = severity;
      if (acknowledged !== undefined) filter.acknowledged = acknowledged === 'true';

      const skip = (Number(page) - 1) * Number(limit);
      const [alerts, totalCount] = await Promise.all([
        Alert.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(Number(limit))
          .lean(),
        Alert.countDocuments(filter)
      ]);

      res.status(200).json({
        success: true,
        data: alerts,
        totalCount,
        page: Number(page),
        totalPages: Math.ceil(totalCount / limit)
      });
    } catch (error) {
      next(error);
    }
  }

  static async acknowledgeAlert(req, res, next) {
    try {
      const alert = await Alert.findByIdAndUpdate(
        req.params.id,
        { acknowledged: true },
        { new: true }
      );
      if (!alert) {
        return res.status(404).json({ success: false, message: 'Alert not found' });
      }

      res.status(200).json({
        success: true,
        message: 'Alert acknowledged',
        data: alert
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
      const [critical, warning, info, total] = await Promise.all([
        Alert.countDocuments({ severity: 'critical' }),
        Alert.countDocuments({ severity: 'warning' }),
        Alert.countDocuments({ severity: 'info' }),
        Alert.countDocuments()
      ]);

      res.status(200).json({
        success: true,
        data: {
          critical,
          warning,
          info,
          total
        }
      });
    } catch (error) {
      next(error);
    }
  }
}
