const PiService = require('../lib/PiService');

module.exports = async (req, res) => {
    try {
        const { token } = req.body;
        const verified = await PiService.verifyToken(token);

        if (verified) {
            res.status(200).json({ message: "Token verified successfully" });
        } else {
            res.status(400).json({ message: "Invalid token" });
        }
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
};
