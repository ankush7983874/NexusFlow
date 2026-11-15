export const validateBody = (zodSchema) => (req, res, next) => {
  const result = zodSchema.safeParse(req.body);
  if (!result.success) {
    const issues = result.error.issues || result.error.errors || [];
    const formatted = issues.map(err => ({
      path: (err.path || []).join('.'),
      message: err.message
    }));
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formatted
    });
  }
  req.body = result.data;
  next();
};
