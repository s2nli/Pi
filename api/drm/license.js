const { forward } = require('../_proxy');
module.exports = (req, res) => forward(req, res, '/api/drm/license');
