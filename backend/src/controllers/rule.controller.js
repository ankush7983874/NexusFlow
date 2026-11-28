import { z } from 'zod';
import { Rule } from '../models/rule.model.js';
import { StreamCompiler } from '../services/compiler.service.js';
import { ruleEngine } from '../services/ruleEngine.service.js';

export const thresholdRuleSchema = z.object({
  name: z.string({ required_error: 'Rule name is required' }).trim().min(2, 'Rule name must be at least 2 characters'),
  description: z.string().trim().optional(),
  deviceId: z.string().trim().default('ALL'),
  metric: z.string({ required_error: 'Telemetry metric is required' }).trim().min(1, 'Metric is required'),
  operator: z.enum(['>', '<', '==', 'between', 'greater than', 'less than', 'equal to'], {
    errorMap: () => ({ message: 'Operator must be greater than, less than, equal to, or between' })
  }),
  threshold: z.number({ invalid_type_error: 'Threshold must be a valid number' }).optional(),
  minThreshold: z.number({ invalid_type_error: 'Minimum threshold must be a valid number' }).optional(),
  maxThreshold: z.number({ invalid_type_error: 'Maximum threshold must be a valid number' }).optional(),
  severity: z.enum(['warning', 'critical']).default('warning'),
  active: z.boolean().default(true)
}).refine(data => {
  const op = String(data.operator).toLowerCase();
  if (op === 'between') {
    return (
      data.minThreshold !== undefined &&
      data.maxThreshold !== undefined &&
      !isNaN(data.minThreshold) &&
      !isNaN(data.maxThreshold) &&
      data.minThreshold <= data.maxThreshold
    );
  }
  return data.threshold !== undefined && !isNaN(data.threshold);
}, {
  message: 'For "between" operator, minThreshold and maxThreshold are required and min must be <= max. For other operators, threshold is required.'
});

export class RuleController {
  static async createThresholdRule(req, res, next) {
    try {
      const { 
        name, 
        description, 
        deviceId, 
        metric, 
        operator, 
        threshold, 
        minThreshold, 
        maxThreshold, 
        severity, 
        active 
      } = req.body;

      const rule = await Rule.create({
        name,
        description: description || '',
        ruleType: 'threshold',
        deviceId: String(deviceId || 'ALL').trim().toUpperCase(),
        metric: String(metric).trim(),
        operator,
        threshold: threshold !== undefined ? Number(threshold) : undefined,
        minThreshold: minThreshold !== undefined ? Number(minThreshold) : undefined,
        maxThreshold: maxThreshold !== undefined ? Number(maxThreshold) : undefined,
        severity: severity || 'warning',
        active: active !== undefined ? Boolean(active) : true
      });

      // Reload threshold rules in the engine
      await ruleEngine.loadThresholdRules();

      res.status(201).json({
        success: true,
        message: 'Threshold rule created successfully',
        data: rule
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateThresholdRule(req, res, next) {
    try {
      const rule = await Rule.findById(req.params.id);
      if (!rule) {
        return res.status(404).json({ success: false, message: 'Rule not found' });
      }

      const { 
        name, 
        description, 
        deviceId, 
        metric, 
        operator, 
        threshold, 
        minThreshold, 
        maxThreshold, 
        severity, 
        active 
      } = req.body;

      rule.name = name || rule.name;
      if (description !== undefined) rule.description = description;
      rule.ruleType = 'threshold';
      if (deviceId) rule.deviceId = String(deviceId).trim().toUpperCase();
      if (metric) rule.metric = String(metric).trim();
      if (operator) rule.operator = operator;
      if (threshold !== undefined) rule.threshold = Number(threshold);
      if (minThreshold !== undefined) rule.minThreshold = Number(minThreshold);
      if (maxThreshold !== undefined) rule.maxThreshold = Number(maxThreshold);
      if (severity) rule.severity = severity;
      if (active !== undefined) rule.active = Boolean(active);

      await rule.save();
      await ruleEngine.loadThresholdRules();

      res.status(200).json({
        success: true,
        message: 'Threshold rule updated successfully',
        data: rule
      });
    } catch (error) {
      next(error);
    }
  }

  static async createRule(req, res, next) {
    try {
      const { name, description, graph, active } = req.body;

      // Validate graph if provided
      if (graph) {
        const validation = StreamCompiler.validateGraph(graph);
        if (!validation.valid) {
          return res.status(400).json({
            success: false,
            message: 'Invalid rule graph',
            errors: validation.errors
          });
        }
      }

      const rule = await Rule.create({
        name,
        description,
        graph: graph || { nodes: [], edges: [] },
        active: active !== undefined ? active : true
      });

      if (rule.active && rule.graph?.nodes?.length > 0) {
        ruleEngine.startRule(rule);
      }

      res.status(201).json({
        success: true,
        message: 'Rule created successfully',
        data: rule
      });
    } catch (error) {
      next(error);
    }
  }

  static async getRules(req, res, next) {
    try {
      const rules = await Rule.find().sort({ updatedAt: -1 }).lean();
      const enriched = rules.map(r => ({
        ...r,
        isRunning: ruleEngine.isRuleRunning(r._id.toString())
      }));

      res.status(200).json({
        success: true,
        data: enriched
      });
    } catch (error) {
      next(error);
    }
  }

  static async getRuleById(req, res, next) {
    try {
      const rule = await Rule.findById(req.params.id);
      if (!rule) {
        return res.status(404).json({ success: false, message: 'Rule not found' });
      }

      res.status(200).json({
        success: true,
        data: {
          ...rule.toObject(),
          isRunning: ruleEngine.isRuleRunning(rule._id.toString())
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateRule(req, res, next) {
    try {
      const { name, description, graph, active } = req.body;

      if (graph) {
        const validation = StreamCompiler.validateGraph(graph);
        if (!validation.valid) {
          return res.status(400).json({
            success: false,
            message: 'Invalid graph structure',
            errors: validation.errors,
            warnings: validation.warnings
          });
        }
      }

      const rule = await Rule.findByIdAndUpdate(
        req.params.id,
        {
          ...(name && { name }),
          ...(description !== undefined && { description }),
          ...(graph && { graph }),
          ...(active !== undefined && { active })
        },
        { new: true }
      );

      if (!rule) {
        return res.status(404).json({ success: false, message: 'Rule not found' });
      }

      // Reload in rule engine
      await ruleEngine.reloadRule(rule._id.toString());

      res.status(200).json({
        success: true,
        message: 'Rule updated and reloaded in stream engine',
        data: {
          ...rule.toObject(),
          isRunning: ruleEngine.isRuleRunning(rule._id.toString())
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async toggleRule(req, res, next) {
    try {
      const rule = await Rule.findById(req.params.id);
      if (!rule) {
        return res.status(404).json({ success: false, message: 'Rule not found' });
      }

      rule.active = !rule.active;
      await rule.save();

      if (rule.active) {
        ruleEngine.startRule(rule);
      } else {
        ruleEngine.stopRule(rule._id.toString());
      }
      await ruleEngine.loadThresholdRules();

      res.status(200).json({
        success: true,
        message: `Rule ${rule.active ? 'started' : 'stopped'}`,
        data: {
          ...rule.toObject(),
          isRunning: ruleEngine.isRuleRunning(rule._id.toString())
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteRule(req, res, next) {
    try {
      const rule = await Rule.findByIdAndDelete(req.params.id);
      if (!rule) {
        return res.status(404).json({ success: false, message: 'Rule not found' });
      }

      ruleEngine.stopRule(rule._id.toString());
      await ruleEngine.loadThresholdRules();

      res.status(200).json({
        success: true,
        message: 'Rule deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async validateGraph(req, res, next) {
    try {
      const { graph } = req.body;
      const validation = StreamCompiler.validateGraph(graph);
      res.status(200).json({
        success: true,
        ...validation
      });
    } catch (error) {
      next(error);
    }
  }
}
