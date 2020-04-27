export class CrDlError extends Error {
}
CrDlError.prototype.name = "CrDlException";

export class UserInputError extends CrDlError {
}
UserInputError.prototype.name = "UserInputException";

export class RuntimeError extends CrDlError {
}
RuntimeError.prototype.name = "RuntimeException";

export class NetworkError extends CrDlError {
}
NetworkError.prototype.name = "NetworkException";

export class CloudflareError extends CrDlError {
}
CloudflareError.prototype.name = "CloudflareException";
