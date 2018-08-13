class CrDlException extends Error {
}
CrDlException.prototype.name = "CrDlException";

class UserInputException extends CrDlException {
}
UserInputException.prototype.name = "UserInputException";

class RuntimeException extends CrDlException {
}
RuntimeException.prototype.name = "RuntimeException";

class NetworkException extends CrDlException {
}
NetworkException.prototype.name = "NetworkException";

class CloudflareException extends CrDlException {
}
CloudflareException.prototype.name = "CloudflareException";

module.exports = { UserInputException, RuntimeException, NetworkException, CloudflareException }