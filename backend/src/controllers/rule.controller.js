import { Rule } from '../models/rule.model.js';
import { StreamCompiler } from '../services/compiler.service.js';
import { ruleEngine } from '../services/ruleEngine.service.js';

export class RuleController {
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
