const { sendMessage, getHistory } = require("../services/ChatService");

/**
 * POST /api/chat/:reportId/message
 */
async function postMessage(req, res, next) {
  try {
    const { reportId } = req.params;
    const patientId = req.user.sub;
    const { message } = req.body;

    const result = await sendMessage(reportId, patientId, message);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/chat/:reportId/history
 */
function getChatHistory(req, res, next) {
  try {
    const { reportId } = req.params;
    const patientId = req.user.sub;

    const result = getHistory(reportId, patientId);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { postMessage, getChatHistory };
