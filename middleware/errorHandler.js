export const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    code: err.code || "INTERNAL_ERROR",
    message: err.message || "Something went wrong",
  });
};
