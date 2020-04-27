declare module "langs" {
    namespace langs {
        interface Language {
            "name": string;
            "local": string;
            "1": string;
            "2": string;
            "2T": string;
            "2B": string;
            "3": string;
        }
        type Type = "1" | "2" | "2B" | "2T" | "3"

        function all(): Language[];
        function has(crit: Type, val: string): boolean;
        function codes(type: Type): string[];
        function names(local: boolean): string[];
        function where(crit: Type, val: string): Language;
    }
    export = langs
}
