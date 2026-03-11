import type { Dictionary, HomeDictionary } from './types';

export function pickHomeDictionary(dict: Dictionary): HomeDictionary {
    return {
        unified: dict.unified,
        page: {
            openMenuLabel: dict.page.openMenuLabel,
        },
        form: dict.form,
        errors: dict.errors,
        history: dict.history,
        toast: dict.toast,
        languages: dict.languages,
        result: dict.result,
        extractAudio: dict.extractAudio,
        feedback: dict.feedback,
        changelog: dict.changelog,
    };
}
