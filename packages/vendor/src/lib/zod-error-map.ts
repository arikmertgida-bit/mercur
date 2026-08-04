import { z, ZodIssueCode } from "zod"
import { i18n } from "../components/utilities/i18n/i18n"

interface ZodValidationMessages {
  required: string
  tooSmall: string
  tooBig: string
  invalid: string
  invalidEmail: string
  invalidUrl: string
}

const MESSAGES: Record<string, ZodValidationMessages> = {
  en: { required: "This field is required.", tooSmall: "Must be at least {min}.", tooBig: "Must be at most {max}.", invalid: "Invalid value.", invalidEmail: "Enter a valid email address.", invalidUrl: "Enter a valid URL." },
  tr: { required: "Bu alan zorunludur.", tooSmall: "En az {min} olmalıdır.", tooBig: "En fazla {max} olmalıdır.", invalid: "Geçersiz değer.", invalidEmail: "Geçerli bir e-posta adresi girin.", invalidUrl: "Geçerli bir URL girin." },
  ar: { required: "هذا الحقل مطلوب.", tooSmall: "يجب أن يكون {min} على الأقل.", tooBig: "يجب ألا يتجاوز {max}.", invalid: "قيمة غير صالحة.", invalidEmail: "أدخل عنوان بريد إلكتروني صالحًا.", invalidUrl: "أدخل رابط URL صالحًا." },
  bg: { required: "Това поле е задължително.", tooSmall: "Трябва да е поне {min}.", tooBig: "Трябва да е най-много {max}.", invalid: "Невалидна стойност.", invalidEmail: "Въведете валиден имейл адрес.", invalidUrl: "Въведете валиден URL адрес." },
  bs: { required: "Ovo polje je obavezno.", tooSmall: "Mora biti najmanje {min}.", tooBig: "Mora biti najviše {max}.", invalid: "Nevažeća vrijednost.", invalidEmail: "Unesite validnu email adresu.", invalidUrl: "Unesite validan URL." },
  cs: { required: "Toto pole je povinné.", tooSmall: "Musí být alespoň {min}.", tooBig: "Musí být nejvýše {max}.", invalid: "Neplatná hodnota.", invalidEmail: "Zadejte platnou e-mailovou adresu.", invalidUrl: "Zadejte platnou URL adresu." },
  de: { required: "Dieses Feld ist erforderlich.", tooSmall: "Muss mindestens {min} sein.", tooBig: "Darf höchstens {max} sein.", invalid: "Ungültiger Wert.", invalidEmail: "Bitte eine gültige E-Mail-Adresse eingeben.", invalidUrl: "Bitte eine gültige URL eingeben." },
  el: { required: "Αυτό το πεδίο είναι υποχρεωτικό.", tooSmall: "Πρέπει να είναι τουλάχιστον {min}.", tooBig: "Πρέπει να είναι το πολύ {max}.", invalid: "Μη έγκυρη τιμή.", invalidEmail: "Εισαγάγετε μια έγκυρη διεύθυνση email.", invalidUrl: "Εισαγάγετε μια έγκυρη διεύθυνση URL." },
  es: { required: "Este campo es obligatorio.", tooSmall: "Debe ser al menos {min}.", tooBig: "Debe ser como máximo {max}.", invalid: "Valor no válido.", invalidEmail: "Introduce una dirección de correo electrónico válida.", invalidUrl: "Introduce una URL válida." },
  fa: { required: "این فیلد الزامی است.", tooSmall: "باید حداقل {min} باشد.", tooBig: "باید حداکثر {max} باشد.", invalid: "مقدار نامعتبر.", invalidEmail: "یک آدرس ایمیل معتبر وارد کنید.", invalidUrl: "یک URL معتبر وارد کنید." },
  fr: { required: "Ce champ est obligatoire.", tooSmall: "Doit être d'au moins {min}.", tooBig: "Doit être d'au plus {max}.", invalid: "Valeur invalide.", invalidEmail: "Veuillez saisir une adresse e-mail valide.", invalidUrl: "Veuillez saisir une URL valide." },
  he: { required: "שדה זה הוא שדה חובה.", tooSmall: "חייב להיות לפחות {min}.", tooBig: "חייב להיות לכל היותר {max}.", invalid: "ערך לא תקין.", invalidEmail: "הזן כתובת אימייל תקינה.", invalidUrl: "הזן כתובת URL תקינה." },
  hu: { required: "Ez a mező kötelező.", tooSmall: "Legalább {min} kell legyen.", tooBig: "Legfeljebb {max} lehet.", invalid: "Érvénytelen érték.", invalidEmail: "Adjon meg egy érvényes e-mail címet.", invalidUrl: "Adjon meg egy érvényes URL-t." },
  id: { required: "Kolom ini wajib diisi.", tooSmall: "Minimal harus {min}.", tooBig: "Maksimal harus {max}.", invalid: "Nilai tidak valid.", invalidEmail: "Masukkan alamat email yang valid.", invalidUrl: "Masukkan URL yang valid." },
  it: { required: "Questo campo è obbligatorio.", tooSmall: "Deve essere almeno {min}.", tooBig: "Deve essere al massimo {max}.", invalid: "Valore non valido.", invalidEmail: "Inserisci un indirizzo email valido.", invalidUrl: "Inserisci un URL valido." },
  ja: { required: "この項目は必須です。", tooSmall: "{min}以上である必要があります。", tooBig: "{max}以下である必要があります。", invalid: "無効な値です。", invalidEmail: "有効なメールアドレスを入力してください。", invalidUrl: "有効なURLを入力してください。" },
  ko: { required: "이 항목은 필수입니다.", tooSmall: "최소 {min} 이상이어야 합니다.", tooBig: "최대 {max} 이하여야 합니다.", invalid: "유효하지 않은 값입니다.", invalidEmail: "유효한 이메일 주소를 입력하세요.", invalidUrl: "유효한 URL을 입력하세요." },
  lt: { required: "Šis laukas yra privalomas.", tooSmall: "Turi būti bent {min}.", tooBig: "Turi būti ne daugiau kaip {max}.", invalid: "Neteisinga reikšmė.", invalidEmail: "Įveskite galiojantį el. pašto adresą.", invalidUrl: "Įveskite galiojantį URL." },
  mk: { required: "Ова поле е задолжително.", tooSmall: "Мора да биде најмалку {min}.", tooBig: "Мора да биде најмногу {max}.", invalid: "Неважечка вредност.", invalidEmail: "Внесете валидна е-адреса.", invalidUrl: "Внесете валиден URL." },
  mn: { required: "Энэ талбарыг заавал бөглөнө үү.", tooSmall: "Хамгийн багадаа {min} байх ёстой.", tooBig: "Хамгийн ихдээ {max} байх ёстой.", invalid: "Буруу утга.", invalidEmail: "Хүчинтэй имэйл хаяг оруулна уу.", invalidUrl: "Хүчинтэй URL оруулна уу." },
  nl: { required: "Dit veld is verplicht.", tooSmall: "Moet minimaal {min} zijn.", tooBig: "Mag maximaal {max} zijn.", invalid: "Ongeldige waarde.", invalidEmail: "Voer een geldig e-mailadres in.", invalidUrl: "Voer een geldige URL in." },
  pl: { required: "To pole jest wymagane.", tooSmall: "Musi wynosić co najmniej {min}.", tooBig: "Musi wynosić maksymalnie {max}.", invalid: "Nieprawidłowa wartość.", invalidEmail: "Wprowadź prawidłowy adres e-mail.", invalidUrl: "Wprowadź prawidłowy adres URL." },
  ptBR: { required: "Este campo é obrigatório.", tooSmall: "Deve ser no mínimo {min}.", tooBig: "Deve ser no máximo {max}.", invalid: "Valor inválido.", invalidEmail: "Insira um endereço de e-mail válido.", invalidUrl: "Insira uma URL válida." },
  ptPT: { required: "Este campo é obrigatório.", tooSmall: "Deve ser no mínimo {min}.", tooBig: "Deve ser no máximo {max}.", invalid: "Valor inválido.", invalidEmail: "Insira um endereço de email válido.", invalidUrl: "Insira um URL válido." },
  ro: { required: "Acest câmp este obligatoriu.", tooSmall: "Trebuie să fie cel puțin {min}.", tooBig: "Trebuie să fie cel mult {max}.", invalid: "Valoare invalidă.", invalidEmail: "Introduceți o adresă de email validă.", invalidUrl: "Introduceți un URL valid." },
  ru: { required: "Это поле обязательно для заполнения.", tooSmall: "Должно быть не менее {min}.", tooBig: "Должно быть не более {max}.", invalid: "Недопустимое значение.", invalidEmail: "Введите действительный адрес электронной почты.", invalidUrl: "Введите действительный URL." },
  th: { required: "ฟิลด์นี้จำเป็นต้องระบุ", tooSmall: "ต้องมีอย่างน้อย {min}", tooBig: "ต้องมีไม่เกิน {max}", invalid: "ค่าไม่ถูกต้อง", invalidEmail: "กรอกอีเมลที่ถูกต้อง", invalidUrl: "กรอก URL ที่ถูกต้อง" },
  uk: { required: "Це поле є обов'язковим.", tooSmall: "Має бути щонайменше {min}.", tooBig: "Має бути не більше {max}.", invalid: "Недійсне значення.", invalidEmail: "Введіть дійсну адресу електронної пошти.", invalidUrl: "Введіть дійсну URL-адресу." },
  vi: { required: "Trường này là bắt buộc.", tooSmall: "Phải có ít nhất {min}.", tooBig: "Phải có tối đa {max}.", invalid: "Giá trị không hợp lệ.", invalidEmail: "Nhập địa chỉ email hợp lệ.", invalidUrl: "Nhập URL hợp lệ." },
  zhCN: { required: "此字段为必填项。", tooSmall: "必须至少为 {min}。", tooBig: "必须最多为 {max}。", invalid: "无效值。", invalidEmail: "请输入有效的电子邮件地址。", invalidUrl: "请输入有效的网址。" },
  zhTW: { required: "此欄位為必填項目。", tooSmall: "必須至少為 {min}。", tooBig: "必須最多為 {max}。", invalid: "無效值。", invalidEmail: "請輸入有效的電子郵件地址。", invalidUrl: "請輸入有效的網址。" },
}

function messagesForCurrentLanguage(): ZodValidationMessages {
  const language = i18n.language?.split("-")[0] ?? "en"
  return MESSAGES[i18n.language] ?? MESSAGES[language] ?? MESSAGES.en
}

/**
 * Zod's built-in default messages ("String must contain at least 1
 * character(s)", "Required") are always English and bypass the app's i18n
 * layer entirely — this custom error map is zod's own supported extension
 * point (https://zod.dev/error-customization#error-map) for replacing them,
 * used only when a schema doesn't already set its own `message`.
 */
const kayiZodErrorMap: z.ZodErrorMap = (issue, ctx) => {
  const messages = messagesForCurrentLanguage()

  if (issue.code === ZodIssueCode.invalid_type && issue.received === "undefined") {
    return { message: messages.required }
  }

  if (issue.code === ZodIssueCode.too_small) {
    return { message: messages.tooSmall.replace("{min}", String(issue.minimum)) }
  }

  if (issue.code === ZodIssueCode.too_big) {
    return { message: messages.tooBig.replace("{max}", String(issue.maximum)) }
  }

  if (issue.code === ZodIssueCode.invalid_string) {
    if (issue.validation === "email") {
      return { message: messages.invalidEmail }
    }
    if (issue.validation === "url") {
      return { message: messages.invalidUrl }
    }
    return { message: messages.invalid }
  }

  if (
    issue.code === ZodIssueCode.invalid_type ||
    issue.code === ZodIssueCode.invalid_enum_value ||
    issue.code === ZodIssueCode.invalid_date
  ) {
    return { message: messages.invalid }
  }

  return { message: ctx.defaultError }
}

export function installKayiZodErrorMap(): void {
  z.setErrorMap(kayiZodErrorMap)
}
