exports.notFound = (req, res, next) => {
  res.status(404).json({ success: false, error: 'Endpoint not found', path: req.path });
};
