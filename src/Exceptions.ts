export class CrDlException extends Error {
}
CrDlException.prototype.name = "CrDlException";

export class UserInputException extends CrDlException {
}
UserInputException.prototype.name = "UserInputException";

export class RuntimeException extends CrDlException {
}
RuntimeException.prototype.name = "RuntimeException";

export class NetworkException extends CrDlException {
}
NetworkException.prototype.name = "NetworkException";

export class CloudflareException extends CrDlException {
}
CloudflareException.prototype.name = "CloudflareException";