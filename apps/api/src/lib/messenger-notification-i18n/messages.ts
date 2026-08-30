import type { NotificationLanguage } from "./languages"

export interface NotificationRequestTypeLabels {
  product_category: string
  product_collection: string
  product_tag: string
  product_type: string
  return_reason: string
}

export interface NotificationMessages {
  /** Fallback display name when the acting customer's name cannot be resolved. */
  genericCustomerName: string
  /** Fallback display name when the acting seller's name cannot be resolved. */
  genericSellerName: string
  order: {
    subject: string
    /** Placeholders: {customerName}, {displayId} */
    preview: string
  }
  review: {
    newSubject: string
    /** Placeholders: {customerName} */
    newPreview: string
    replySubject: string
    /** Placeholders: {sellerName} */
    replyPreview: string
    reportResolvedSubject: string
    reportDeletedPreview: string
    reportRejectedPreview: string
    imageReportResolvedSubject: string
    imageHiddenPreview: string
    imagePublishedPreview: string
  }
  follower: {
    subject: string
    /** Placeholders: {customerName} */
    preview: string
  }
  payout: {
    subject: string
    /** Placeholders: {displayId}, {amount}, {currency} */
    preview: string
  }
  return: {
    subject: string
    /** Placeholders: {customerName}, {displayId} */
    preview: string
    receivedSubject: string
    /** Placeholders: {sellerName}, {displayId} */
    receivedPreview: string
  }
  request: {
    statusSubject: string
    /** Placeholders: {label} */
    acceptedPreview: string
    /** Placeholders: {label} */
    rejectedPreview: string
    fallbackTypeLabel: string
    typeLabels: NotificationRequestTypeLabels
  }
}

export const NOTIFICATION_MESSAGES: Record<NotificationLanguage, NotificationMessages> = {
  en: {
    genericCustomerName: "A customer",
    genericSellerName: "Seller",
    order: {
      subject: "New Order",
      preview: "{customerName} placed a new order. Order No: #{displayId}",
    },
    review: {
      newSubject: "New Review",
      newPreview: "{customerName} left a new review on the product.",
      replySubject: "Review Reply Notification",
      replyPreview: "{sellerName} replied to the review.",
      reportResolvedSubject: "Review Report Result",
      reportDeletedPreview: "The review you reported has been reviewed and removed.",
      reportRejectedPreview: "Reviewed, not removed. If you disagree, you may submit another report.",
      imageReportResolvedSubject: "Image Review Result",
      imageHiddenPreview: "Thank you for your attentiveness and for reporting it, from the Kayı.com team. The image has been fully removed from our systems.",
      imagePublishedPreview: "Thank you for your courtesy and for reporting it. We don't believe this image violates our policy; if you disagree, please take another look and report it to us again.",
    },
    follower: {
      subject: "New Follower",
      preview: "{customerName} started following the store.",
    },
    payout: {
      subject: "Payout Sent",
      preview: "Your payout #{displayId} has been sent: {amount} {currency}",
    },
    return: {
      subject: "New Return Request",
      preview: "{customerName} requested a return for order #{displayId}.",
      receivedSubject: "Return Received",
      receivedPreview: "{sellerName} has received your return for order #{displayId}.",
    },
    request: {
      statusSubject: "Request Status",
      acceptedPreview: "Your {label} request has been approved.",
      rejectedPreview: "Your {label} request has been rejected.",
      fallbackTypeLabel: "Request",
      typeLabels: {
        product_category: "Category",
        product_collection: "Collection",
        product_tag: "Tag",
        product_type: "Product Type",
        return_reason: "Return Reason",
      },
    },
  },
  tr: {
    genericCustomerName: "Bir müşteri",
    genericSellerName: "Satıcı",
    order: {
      subject: "Yeni Sipariş",
      preview: "{customerName} yeni bir sipariş oluşturdu. Sipariş No: #{displayId}",
    },
    review: {
      newSubject: "Yeni Değerlendirme",
      newPreview: "{customerName} ürüne yeni bir yorum bıraktı.",
      replySubject: "Yorum Yanıtı Bildirimi",
      replyPreview: "{sellerName} değerlendirmeye yanıt verdi.",
      reportResolvedSubject: "Değerlendirme Talebi Sonucu",
      reportDeletedPreview: "Bildirdiğiniz değerlendirme incelendi ve kaldırıldı.",
      reportRejectedPreview: "İncelendi, Kaldırılmadı. Siz bizimle aynı düşüncede değilseniz tekrar talepte bulunabilirsiniz.",
      imageReportResolvedSubject: "Görsel İnceleme Sonucu",
      imageHiddenPreview: "Duyarlılığınız ve ilginizden dolayı Kayı.com ailesi olarak teşekkür ederiz. Görsel tamamen sistemlerimizden kaldırılmıştır.",
      imagePublishedPreview: "Nezaketiniz ve ilginizden dolayı teşekkür ederiz. Bu görsel politikamızı ihlal etmediğini düşünüyoruz; siz aynı fikirde değilseniz lütfen tekrar inceleyip bize ihbar edebilirsiniz.",
    },
    follower: {
      subject: "Yeni Takipçi",
      preview: "{customerName} mağazayı takip etmeye başladı.",
    },
    payout: {
      subject: "Ödeme Gönderildi",
      preview: "#{displayId} numaralı ödemeniz gönderildi: {amount} {currency}",
    },
    return: {
      subject: "Yeni İade Talebi",
      preview: "{customerName} #{displayId} numaralı sipariş için iade talebinde bulundu.",
      receivedSubject: "İade Teslim Alındı",
      receivedPreview: "{sellerName}, #{displayId} numaralı siparişteki iadenizi teslim aldı.",
    },
    request: {
      statusSubject: "Talep Durumu",
      acceptedPreview: "{label} talebiniz onaylandı.",
      rejectedPreview: "{label} talebiniz reddedildi.",
      fallbackTypeLabel: "Talep",
      typeLabels: {
        product_category: "Kategori",
        product_collection: "Koleksiyon",
        product_tag: "Etiket",
        product_type: "Ürün Tipi",
        return_reason: "İade Nedeni",
      },
    },
  },
  de: {
    genericCustomerName: "Ein Kunde",
    genericSellerName: "Verkäufer",
    order: {
      subject: "Neue Bestellung",
      preview: "{customerName} hat eine neue Bestellung aufgegeben. Bestellnr.: #{displayId}",
    },
    review: {
      newSubject: "Neue Bewertung",
      newPreview: "{customerName} hat eine neue Bewertung zum Produkt hinterlassen.",
      replySubject: "Antwort auf Bewertung",
      replyPreview: "{sellerName} hat auf die Bewertung geantwortet.",
      reportResolvedSubject: "Ergebnis der Bewertungsmeldung",
      reportDeletedPreview: "Die von Ihnen gemeldete Bewertung wurde geprüft und entfernt.",
      reportRejectedPreview: "Geprüft, nicht entfernt. Wenn Sie nicht einverstanden sind, können Sie erneut eine Meldung einreichen.",
      imageReportResolvedSubject: "Ergebnis der Bildprüfung",
      imageHiddenPreview: "Vielen Dank für Ihre Aufmerksamkeit und Ihre Meldung im Namen des Kayı.com-Teams. Das Bild wurde vollständig aus unseren Systemen entfernt.",
      imagePublishedPreview: "Vielen Dank für Ihre Rücksichtnahme und Ihre Meldung. Wir sind der Ansicht, dass dieses Bild nicht gegen unsere Richtlinien verstößt; falls Sie anderer Meinung sind, prüfen Sie es bitte erneut und melden Sie es uns.",
    },
    follower: {
      subject: "Neuer Follower",
      preview: "{customerName} folgt jetzt dem Shop.",
    },
    payout: {
      subject: "Auszahlung gesendet",
      preview: "Ihre Auszahlung #{displayId} wurde gesendet: {amount} {currency}",
    },
    return: {
      subject: "Neue Rückgabeanfrage",
      preview: "{customerName} hat für Bestellung #{displayId} eine Rückgabe angefordert.",
      receivedSubject: "Rückgabe erhalten",
      receivedPreview: "{sellerName} hat Ihre Rückgabe zu Bestellung #{displayId} erhalten.",
    },
    request: {
      statusSubject: "Anfragestatus",
      acceptedPreview: "Ihre Anfrage „{label}“ wurde genehmigt.",
      rejectedPreview: "Ihre Anfrage „{label}“ wurde abgelehnt.",
      fallbackTypeLabel: "Anfrage",
      typeLabels: {
        product_category: "Kategorie",
        product_collection: "Kollektion",
        product_tag: "Tag",
        product_type: "Produkttyp",
        return_reason: "Rückgabegrund",
      },
    },
  },
  fr: {
    genericCustomerName: "Un client",
    genericSellerName: "Vendeur",
    order: {
      subject: "Nouvelle commande",
      preview: "{customerName} a passé une nouvelle commande. N° de commande : #{displayId}",
    },
    review: {
      newSubject: "Nouvel avis",
      newPreview: "{customerName} a laissé un nouvel avis sur le produit.",
      replySubject: "Notification de réponse à l'avis",
      replyPreview: "{sellerName} a répondu à l'avis.",
      reportResolvedSubject: "Résultat du signalement d'avis",
      reportDeletedPreview: "L'avis que vous avez signalé a été examiné et supprimé.",
      reportRejectedPreview: "Examiné, non supprimé. Si vous n'êtes pas d'accord, vous pouvez soumettre un nouveau signalement.",
      imageReportResolvedSubject: "Résultat de l'examen de l'image",
      imageHiddenPreview: "Merci pour votre vigilance et votre signalement, de la part de l'équipe Kayı.com. L'image a été entièrement supprimée de nos systèmes.",
      imagePublishedPreview: "Merci pour votre courtoisie et votre signalement. Nous estimons que cette image ne viole pas notre politique ; si vous n'êtes pas d'accord, veuillez la réexaminer et nous la signaler à nouveau.",
    },
    follower: {
      subject: "Nouvel abonné",
      preview: "{customerName} a commencé à suivre la boutique.",
    },
    payout: {
      subject: "Versement envoyé",
      preview: "Votre versement #{displayId} a été envoyé : {amount} {currency}",
    },
    return: {
      subject: "Nouvelle demande de retour",
      preview: "{customerName} a demandé un retour pour la commande #{displayId}.",
      receivedSubject: "Retour reçu",
      receivedPreview: "{sellerName} a reçu votre retour pour la commande #{displayId}.",
    },
    request: {
      statusSubject: "Statut de la demande",
      acceptedPreview: "Votre demande « {label} » a été approuvée.",
      rejectedPreview: "Votre demande « {label} » a été rejetée.",
      fallbackTypeLabel: "Demande",
      typeLabels: {
        product_category: "Catégorie",
        product_collection: "Collection",
        product_tag: "Étiquette",
        product_type: "Type de produit",
        return_reason: "Motif de retour",
      },
    },
  },
  es: {
    genericCustomerName: "Un cliente",
    genericSellerName: "Vendedor",
    order: {
      subject: "Nuevo pedido",
      preview: "{customerName} ha realizado un nuevo pedido. N.º de pedido: #{displayId}",
    },
    review: {
      newSubject: "Nueva reseña",
      newPreview: "{customerName} dejó una nueva reseña en el producto.",
      replySubject: "Notificación de respuesta a la reseña",
      replyPreview: "{sellerName} respondió a la reseña.",
      reportResolvedSubject: "Resultado del reporte de reseña",
      reportDeletedPreview: "La reseña que reportaste fue revisada y eliminada.",
      reportRejectedPreview: "Revisada, no eliminada. Si no estás de acuerdo, puedes enviar otro reporte.",
      imageReportResolvedSubject: "Resultado de la revisión de la imagen",
      imageHiddenPreview: "Gracias por tu atención y por reportarlo, de parte del equipo de Kayı.com. La imagen ha sido eliminada por completo de nuestros sistemas.",
      imagePublishedPreview: "Gracias por tu cortesía y por reportarlo. Consideramos que esta imagen no infringe nuestra política; si no estás de acuerdo, vuelve a revisarla y repórtala de nuevo.",
    },
    follower: {
      subject: "Nuevo seguidor",
      preview: "{customerName} ha comenzado a seguir la tienda.",
    },
    payout: {
      subject: "Pago enviado",
      preview: "Tu pago #{displayId} ha sido enviado: {amount} {currency}",
    },
    return: {
      subject: "Nueva solicitud de devolución",
      preview: "{customerName} solicitó una devolución del pedido #{displayId}.",
      receivedSubject: "Devolución recibida",
      receivedPreview: "{sellerName} ha recibido tu devolución del pedido #{displayId}.",
    },
    request: {
      statusSubject: "Estado de la solicitud",
      acceptedPreview: "Tu solicitud de {label} ha sido aprobada.",
      rejectedPreview: "Tu solicitud de {label} ha sido rechazada.",
      fallbackTypeLabel: "Solicitud",
      typeLabels: {
        product_category: "Categoría",
        product_collection: "Colección",
        product_tag: "Etiqueta",
        product_type: "Tipo de producto",
        return_reason: "Motivo de devolución",
      },
    },
  },
  it: {
    genericCustomerName: "Un cliente",
    genericSellerName: "Venditore",
    order: {
      subject: "Nuovo ordine",
      preview: "{customerName} ha effettuato un nuovo ordine. N. ordine: #{displayId}",
    },
    review: {
      newSubject: "Nuova recensione",
      newPreview: "{customerName} ha lasciato una nuova recensione sul prodotto.",
      replySubject: "Notifica di risposta alla recensione",
      replyPreview: "{sellerName} ha risposto alla recensione.",
      reportResolvedSubject: "Esito della segnalazione della recensione",
      reportDeletedPreview: "La recensione che hai segnalato è stata esaminata e rimossa.",
      reportRejectedPreview: "Esaminata, non rimossa. Se non sei d'accordo, puoi inviare una nuova segnalazione.",
      imageReportResolvedSubject: "Esito della revisione dell'immagine",
      imageHiddenPreview: "Grazie per la tua sensibilità e per averla segnalata, da parte del team di Kayı.com. L'immagine è stata completamente rimossa dai nostri sistemi.",
      imagePublishedPreview: "Grazie per la tua cortesia e per averla segnalata. Riteniamo che questa immagine non violi le nostre norme; se non sei d'accordo, ricontrollala e segnalacela di nuovo.",
    },
    follower: {
      subject: "Nuovo follower",
      preview: "{customerName} ha iniziato a seguire il negozio.",
    },
    payout: {
      subject: "Pagamento inviato",
      preview: "Il tuo pagamento #{displayId} è stato inviato: {amount} {currency}",
    },
    return: {
      subject: "Nuova richiesta di reso",
      preview: "{customerName} ha richiesto un reso per l'ordine #{displayId}.",
      receivedSubject: "Reso ricevuto",
      receivedPreview: "{sellerName} ha ricevuto il tuo reso per l'ordine #{displayId}.",
    },
    request: {
      statusSubject: "Stato della richiesta",
      acceptedPreview: "La tua richiesta di {label} è stata approvata.",
      rejectedPreview: "La tua richiesta di {label} è stata rifiutata.",
      fallbackTypeLabel: "Richiesta",
      typeLabels: {
        product_category: "Categoria",
        product_collection: "Collezione",
        product_tag: "Tag",
        product_type: "Tipo di prodotto",
        return_reason: "Motivo di reso",
      },
    },
  },
  ptBR: {
    genericCustomerName: "Um cliente",
    genericSellerName: "Vendedor",
    order: {
      subject: "Novo pedido",
      preview: "{customerName} fez um novo pedido. Nº do pedido: #{displayId}",
    },
    review: {
      newSubject: "Nova avaliação",
      newPreview: "{customerName} deixou uma nova avaliação no produto.",
      replySubject: "Notificação de resposta à avaliação",
      replyPreview: "{sellerName} respondeu à avaliação.",
      reportResolvedSubject: "Resultado da denúncia de avaliação",
      reportDeletedPreview: "A avaliação que você denunciou foi analisada e removida.",
      reportRejectedPreview: "Analisada, não removida. Se você discordar, pode enviar uma nova denúncia.",
      imageReportResolvedSubject: "Resultado da análise da imagem",
      imageHiddenPreview: "Obrigado pela sua atenção e por denunciar, da equipe Kayı.com. A imagem foi totalmente removida dos nossos sistemas.",
      imagePublishedPreview: "Obrigado pela sua gentileza e por denunciar. Entendemos que esta imagem não viola nossa política; se você discordar, reveja e denuncie novamente.",
    },
    follower: {
      subject: "Novo seguidor",
      preview: "{customerName} começou a seguir a loja.",
    },
    payout: {
      subject: "Pagamento enviado",
      preview: "Seu pagamento #{displayId} foi enviado: {amount} {currency}",
    },
    return: {
      subject: "Nova solicitação de devolução",
      preview: "{customerName} solicitou a devolução do pedido #{displayId}.",
      receivedSubject: "Devolução recebida",
      receivedPreview: "{sellerName} recebeu sua devolução do pedido #{displayId}.",
    },
    request: {
      statusSubject: "Status da solicitação",
      acceptedPreview: "Sua solicitação de {label} foi aprovada.",
      rejectedPreview: "Sua solicitação de {label} foi rejeitada.",
      fallbackTypeLabel: "Solicitação",
      typeLabels: {
        product_category: "Categoria",
        product_collection: "Coleção",
        product_tag: "Tag",
        product_type: "Tipo de produto",
        return_reason: "Motivo de devolução",
      },
    },
  },
  ptPT: {
    genericCustomerName: "Um cliente",
    genericSellerName: "Vendedor",
    order: {
      subject: "Nova encomenda",
      preview: "{customerName} fez uma nova encomenda. N.º de encomenda: #{displayId}",
    },
    review: {
      newSubject: "Nova avaliação",
      newPreview: "{customerName} deixou uma nova avaliação no produto.",
      replySubject: "Notificação de resposta à avaliação",
      replyPreview: "{sellerName} respondeu à avaliação.",
      reportResolvedSubject: "Resultado da denúncia de avaliação",
      reportDeletedPreview: "A avaliação que denunciou foi analisada e removida.",
      reportRejectedPreview: "Analisada, não removida. Se não concordar, pode submeter uma nova denúncia.",
      imageReportResolvedSubject: "Resultado da análise da imagem",
      imageHiddenPreview: "Obrigado pela sua atenção e por denunciar, da equipa Kayı.com. A imagem foi totalmente removida dos nossos sistemas.",
      imagePublishedPreview: "Obrigado pela sua delicadeza e por denunciar. Consideramos que esta imagem não viola a nossa política; se não concordar, reveja-a e denuncie-a novamente.",
    },
    follower: {
      subject: "Novo seguidor",
      preview: "{customerName} começou a seguir a loja.",
    },
    payout: {
      subject: "Pagamento enviado",
      preview: "O seu pagamento #{displayId} foi enviado: {amount} {currency}",
    },
    return: {
      subject: "Novo pedido de devolução",
      preview: "{customerName} pediu a devolução da encomenda #{displayId}.",
      receivedSubject: "Devolução recebida",
      receivedPreview: "{sellerName} recebeu a sua devolução da encomenda #{displayId}.",
    },
    request: {
      statusSubject: "Estado do pedido",
      acceptedPreview: "O seu pedido de {label} foi aprovado.",
      rejectedPreview: "O seu pedido de {label} foi rejeitado.",
      fallbackTypeLabel: "Pedido",
      typeLabels: {
        product_category: "Categoria",
        product_collection: "Coleção",
        product_tag: "Etiqueta",
        product_type: "Tipo de produto",
        return_reason: "Motivo de devolução",
      },
    },
  },
  ru: {
    genericCustomerName: "Покупатель",
    genericSellerName: "Продавец",
    order: {
      subject: "Новый заказ",
      preview: "{customerName} оформил новый заказ. Номер заказа: #{displayId}",
    },
    review: {
      newSubject: "Новый отзыв",
      newPreview: "{customerName} оставил новый отзыв о товаре.",
      replySubject: "Уведомление об ответе на отзыв",
      replyPreview: "{sellerName} ответил на отзыв.",
      reportResolvedSubject: "Результат рассмотрения жалобы на отзыв",
      reportDeletedPreview: "Отзыв, на который вы пожаловались, был рассмотрен и удалён.",
      reportRejectedPreview: "Рассмотрено, не удалено. Если вы не согласны, вы можете подать повторную жалобу.",
      imageReportResolvedSubject: "Результат проверки изображения",
      imageHiddenPreview: "Благодарим за внимательность и обращение от лица команды Kayı.com. Изображение полностью удалено из наших систем.",
      imagePublishedPreview: "Благодарим за корректность и обращение. Мы считаем, что это изображение не нарушает наши правила; если вы не согласны, пожалуйста, проверьте его ещё раз и сообщите нам снова.",
    },
    follower: {
      subject: "Новый подписчик",
      preview: "{customerName} начал(а) подписываться на магазин.",
    },
    payout: {
      subject: "Выплата отправлена",
      preview: "Ваша выплата #{displayId} отправлена: {amount} {currency}",
    },
    return: {
      subject: "Новый запрос на возврат",
      preview: "{customerName} запросил(а) возврат по заказу #{displayId}.",
      receivedSubject: "Возврат получен",
      receivedPreview: "{sellerName} получил ваш возврат по заказу #{displayId}.",
    },
    request: {
      statusSubject: "Статус заявки",
      acceptedPreview: "Ваша заявка «{label}» одобрена.",
      rejectedPreview: "Ваша заявка «{label}» отклонена.",
      fallbackTypeLabel: "Заявка",
      typeLabels: {
        product_category: "Категория",
        product_collection: "Коллекция",
        product_tag: "Тег",
        product_type: "Тип товара",
        return_reason: "Причина возврата",
      },
    },
  },
  uk: {
    genericCustomerName: "Покупець",
    genericSellerName: "Продавець",
    order: {
      subject: "Нове замовлення",
      preview: "{customerName} оформив(-ла) нове замовлення. Номер замовлення: #{displayId}",
    },
    review: {
      newSubject: "Новий відгук",
      newPreview: "{customerName} залишив(-ла) новий відгук про товар.",
      replySubject: "Сповіщення про відповідь на відгук",
      replyPreview: "{sellerName} відповів(-ла) на відгук.",
      reportResolvedSubject: "Результат розгляду скарги на відгук",
      reportDeletedPreview: "Відгук, на який ви поскаржилися, розглянуто та видалено.",
      reportRejectedPreview: "Розглянуто, не видалено. Якщо ви не згодні, можете подати повторну скаргу.",
      imageReportResolvedSubject: "Результат перевірки зображення",
      imageHiddenPreview: "Дякуємо за уважність і звернення від команди Kayı.com. Зображення повністю видалено з наших систем.",
      imagePublishedPreview: "Дякуємо за коректність і звернення. Ми вважаємо, що це зображення не порушує наші правила; якщо ви не згодні, будь ласка, перевірте ще раз і повідомте нас знову.",
    },
    follower: {
      subject: "Новий підписник",
      preview: "{customerName} почав(-ла) стежити за магазином.",
    },
    payout: {
      subject: "Виплату надіслано",
      preview: "Вашу виплату #{displayId} надіслано: {amount} {currency}",
    },
    return: {
      subject: "Новий запит на повернення",
      preview: "{customerName} подав(-ла) запит на повернення замовлення #{displayId}.",
      receivedSubject: "Повернення отримано",
      receivedPreview: "{sellerName} отримав(-ла) ваше повернення за замовленням #{displayId}.",
    },
    request: {
      statusSubject: "Статус заявки",
      acceptedPreview: "Вашу заявку «{label}» схвалено.",
      rejectedPreview: "Вашу заявку «{label}» відхилено.",
      fallbackTypeLabel: "Заявка",
      typeLabels: {
        product_category: "Категорія",
        product_collection: "Колекція",
        product_tag: "Тег",
        product_type: "Тип товару",
        return_reason: "Причина повернення",
      },
    },
  },
  pl: {
    genericCustomerName: "Klient",
    genericSellerName: "Sprzedawca",
    order: {
      subject: "Nowe zamówienie",
      preview: "{customerName} złożył(a) nowe zamówienie. Nr zamówienia: #{displayId}",
    },
    review: {
      newSubject: "Nowa recenzja",
      newPreview: "{customerName} dodał(a) nową recenzję produktu.",
      replySubject: "Powiadomienie o odpowiedzi na recenzję",
      replyPreview: "{sellerName} odpowiedział(a) na recenzję.",
      reportResolvedSubject: "Wynik zgłoszenia recenzji",
      reportDeletedPreview: "Zgłoszona przez Ciebie recenzja została sprawdzona i usunięta.",
      reportRejectedPreview: "Sprawdzono, nie usunięto. Jeśli się nie zgadzasz, możesz złożyć kolejne zgłoszenie.",
      imageReportResolvedSubject: "Wynik weryfikacji zdjęcia",
      imageHiddenPreview: "Dziękujemy za czujność i zgłoszenie w imieniu zespołu Kayı.com. Zdjęcie zostało całkowicie usunięte z naszych systemów.",
      imagePublishedPreview: "Dziękujemy za uprzejmość i zgłoszenie. Uważamy, że to zdjęcie nie narusza naszych zasad; jeśli się nie zgadzasz, sprawdź je ponownie i zgłoś jeszcze raz.",
    },
    follower: {
      subject: "Nowy obserwujący",
      preview: "{customerName} zaczął(-ęła) obserwować sklep.",
    },
    payout: {
      subject: "Wypłata wysłana",
      preview: "Twoja wypłata #{displayId} została wysłana: {amount} {currency}",
    },
    return: {
      subject: "Nowa prośba o zwrot",
      preview: "{customerName} poprosił(a) o zwrot zamówienia #{displayId}.",
      receivedSubject: "Zwrot otrzymany",
      receivedPreview: "{sellerName} otrzymał(a) Twój zwrot zamówienia #{displayId}.",
    },
    request: {
      statusSubject: "Status wniosku",
      acceptedPreview: "Twój wniosek „{label}” został zatwierdzony.",
      rejectedPreview: "Twój wniosek „{label}” został odrzucony.",
      fallbackTypeLabel: "Wniosek",
      typeLabels: {
        product_category: "Kategoria",
        product_collection: "Kolekcja",
        product_tag: "Tag",
        product_type: "Typ produktu",
        return_reason: "Powód zwrotu",
      },
    },
  },
  cs: {
    genericCustomerName: "Zákazník",
    genericSellerName: "Prodejce",
    order: {
      subject: "Nová objednávka",
      preview: "{customerName} vytvořil(a) novou objednávku. Číslo objednávky: #{displayId}",
    },
    review: {
      newSubject: "Nová recenze",
      newPreview: "{customerName} přidal(a) novou recenzi produktu.",
      replySubject: "Oznámení o odpovědi na recenzi",
      replyPreview: "{sellerName} odpověděl(a) na recenzi.",
      reportResolvedSubject: "Výsledek nahlášení recenze",
      reportDeletedPreview: "Recenze, kterou jste nahlásili, byla přezkoumána a odstraněna.",
      reportRejectedPreview: "Přezkoumáno, neodstraněno. Pokud nesouhlasíte, můžete podat další nahlášení.",
      imageReportResolvedSubject: "Výsledek kontroly obrázku",
      imageHiddenPreview: "Děkujeme za vaši všímavost a nahlášení jménem týmu Kayı.com. Obrázek byl zcela odstraněn z našich systémů.",
      imagePublishedPreview: "Děkujeme za vaši ohleduplnost a nahlášení. Domníváme se, že tento obrázek neporušuje naše zásady; pokud nesouhlasíte, zkontrolujte jej prosím znovu a znovu nám jej nahlaste.",
    },
    follower: {
      subject: "Nový sledující",
      preview: "{customerName} začal(a) sledovat obchod.",
    },
    payout: {
      subject: "Výplata odeslána",
      preview: "Vaše výplata #{displayId} byla odeslána: {amount} {currency}",
    },
    return: {
      subject: "Nová žádost o vrácení",
      preview: "{customerName} požádal(a) o vrácení objednávky #{displayId}.",
      receivedSubject: "Vrácení přijato",
      receivedPreview: "{sellerName} přijal(a) vaše vrácení objednávky #{displayId}.",
    },
    request: {
      statusSubject: "Stav žádosti",
      acceptedPreview: "Vaše žádost „{label}“ byla schválena.",
      rejectedPreview: "Vaše žádost „{label}“ byla zamítnuta.",
      fallbackTypeLabel: "Žádost",
      typeLabels: {
        product_category: "Kategorie",
        product_collection: "Kolekce",
        product_tag: "Štítek",
        product_type: "Typ produktu",
        return_reason: "Důvod vrácení",
      },
    },
  },
  bg: {
    genericCustomerName: "Клиент",
    genericSellerName: "Продавач",
    order: {
      subject: "Нова поръчка",
      preview: "{customerName} направи нова поръчка. Номер на поръчка: #{displayId}",
    },
    review: {
      newSubject: "Нова рецензия",
      newPreview: "{customerName} остави нова рецензия за продукта.",
      replySubject: "Известие за отговор на рецензия",
      replyPreview: "{sellerName} отговори на рецензията.",
      reportResolvedSubject: "Резултат от сигнала за рецензия",
      reportDeletedPreview: "Рецензията, за която сигнализирахте, беше прегледана и премахната.",
      reportRejectedPreview: "Прегледано, не е премахнато. Ако не сте съгласни, можете да подадете нов сигнал.",
      imageReportResolvedSubject: "Резултат от прегледа на изображението",
      imageHiddenPreview: "Благодарим за вниманието и сигнала от името на екипа на Kayı.com. Изображението беше напълно премахнато от нашите системи.",
      imagePublishedPreview: "Благодарим за коректността и сигнала. Смятаме, че това изображение не нарушава нашите правила; ако не сте съгласни, моля, прегледайте го отново и сигнализирайте пак.",
    },
    follower: {
      subject: "Нов последовател",
      preview: "{customerName} започна да следва магазина.",
    },
    payout: {
      subject: "Плащането е изпратено",
      preview: "Плащането ви #{displayId} беше изпратено: {amount} {currency}",
    },
    return: {
      subject: "Нова заявка за връщане",
      preview: "{customerName} поиска връщане на поръчка #{displayId}.",
      receivedSubject: "Връщането е получено",
      receivedPreview: "{sellerName} получи вашето връщане на поръчка #{displayId}.",
    },
    request: {
      statusSubject: "Статус на заявката",
      acceptedPreview: "Заявката ви „{label}“ беше одобрена.",
      rejectedPreview: "Заявката ви „{label}“ беше отхвърлена.",
      fallbackTypeLabel: "Заявка",
      typeLabels: {
        product_category: "Категория",
        product_collection: "Колекция",
        product_tag: "Таг",
        product_type: "Тип продукт",
        return_reason: "Причина за връщане",
      },
    },
  },
  bs: {
    genericCustomerName: "Kupac",
    genericSellerName: "Prodavac",
    order: {
      subject: "Nova narudžba",
      preview: "{customerName} je napravio(la) novu narudžbu. Broj narudžbe: #{displayId}",
    },
    review: {
      newSubject: "Nova recenzija",
      newPreview: "{customerName} je ostavio(la) novu recenziju proizvoda.",
      replySubject: "Obavijest o odgovoru na recenziju",
      replyPreview: "{sellerName} je odgovorio(la) na recenziju.",
      reportResolvedSubject: "Rezultat prijave recenzije",
      reportDeletedPreview: "Recenzija koju ste prijavili je pregledana i uklonjena.",
      reportRejectedPreview: "Pregledano, nije uklonjeno. Ako se ne slažete, možete podnijeti novu prijavu.",
      imageReportResolvedSubject: "Rezultat pregleda slike",
      imageHiddenPreview: "Hvala na pažnji i prijavi, u ime tima Kayı.com. Slika je u potpunosti uklonjena iz naših sistema.",
      imagePublishedPreview: "Hvala na ljubaznosti i prijavi. Smatramo da ova slika ne krši naša pravila; ako se ne slažete, molimo ponovo je pregledajte i prijavite nam je opet.",
    },
    follower: {
      subject: "Novi pratilac",
      preview: "{customerName} je počeo(la) da prati prodavnicu.",
    },
    payout: {
      subject: "Isplata poslana",
      preview: "Vaša isplata #{displayId} je poslana: {amount} {currency}",
    },
    return: {
      subject: "Novi zahtjev za povrat",
      preview: "{customerName} je zatražio(la) povrat za narudžbu #{displayId}.",
      receivedSubject: "Povrat primljen",
      receivedPreview: "{sellerName} je primio(la) vaš povrat za narudžbu #{displayId}.",
    },
    request: {
      statusSubject: "Status zahtjeva",
      acceptedPreview: "Vaš zahtjev „{label}” je odobren.",
      rejectedPreview: "Vaš zahtjev „{label}” je odbijen.",
      fallbackTypeLabel: "Zahtjev",
      typeLabels: {
        product_category: "Kategorija",
        product_collection: "Kolekcija",
        product_tag: "Oznaka",
        product_type: "Tip proizvoda",
        return_reason: "Razlog povrata",
      },
    },
  },
  el: {
    genericCustomerName: "Ένας πελάτης",
    genericSellerName: "Πωλητής",
    order: {
      subject: "Νέα παραγγελία",
      preview: "Ο/Η {customerName} έκανε μια νέα παραγγελία. Αρ. παραγγελίας: #{displayId}",
    },
    review: {
      newSubject: "Νέα αξιολόγηση",
      newPreview: "Ο/Η {customerName} άφησε μια νέα αξιολόγηση στο προϊόν.",
      replySubject: "Ειδοποίηση απάντησης αξιολόγησης",
      replyPreview: "Ο/Η {sellerName} απάντησε στην αξιολόγηση.",
      reportResolvedSubject: "Αποτέλεσμα αναφοράς αξιολόγησης",
      reportDeletedPreview: "Η αξιολόγηση που αναφέρατε ελέγχθηκε και αφαιρέθηκε.",
      reportRejectedPreview: "Ελέγχθηκε, δεν αφαιρέθηκε. Αν διαφωνείτε, μπορείτε να υποβάλετε νέα αναφορά.",
      imageReportResolvedSubject: "Αποτέλεσμα ελέγχου εικόνας",
      imageHiddenPreview: "Ευχαριστούμε για την προσοχή και την αναφορά σας εκ μέρους της ομάδας Kayı.com. Η εικόνα αφαιρέθηκε πλήρως από τα συστήματά μας.",
      imagePublishedPreview: "Ευχαριστούμε για την ευγένεια και την αναφορά σας. Θεωρούμε ότι αυτή η εικόνα δεν παραβιάζει την πολιτική μας· αν διαφωνείτε, ελέγξτε την ξανά και αναφέρετέ την εκ νέου.",
    },
    follower: {
      subject: "Νέος ακόλουθος",
      preview: "Ο/Η {customerName} ξεκίνησε να ακολουθεί το κατάστημα.",
    },
    payout: {
      subject: "Η πληρωμή στάλθηκε",
      preview: "Η πληρωμή σας #{displayId} στάλθηκε: {amount} {currency}",
    },
    return: {
      subject: "Νέο αίτημα επιστροφής",
      preview: "Ο/Η {customerName} ζήτησε επιστροφή για την παραγγελία #{displayId}.",
      receivedSubject: "Η επιστροφή παραλήφθηκε",
      receivedPreview: "Ο/Η {sellerName} παρέλαβε την επιστροφή σας για την παραγγελία #{displayId}.",
    },
    request: {
      statusSubject: "Κατάσταση αιτήματος",
      acceptedPreview: "Το αίτημά σας «{label}» εγκρίθηκε.",
      rejectedPreview: "Το αίτημά σας «{label}» απορρίφθηκε.",
      fallbackTypeLabel: "Αίτημα",
      typeLabels: {
        product_category: "Κατηγορία",
        product_collection: "Συλλογή",
        product_tag: "Ετικέτα",
        product_type: "Τύπος προϊόντος",
        return_reason: "Αιτία επιστροφής",
      },
    },
  },
  fa: {
    genericCustomerName: "یک مشتری",
    genericSellerName: "فروشنده",
    order: {
      subject: "سفارش جدید",
      preview: "{customerName} یک سفارش جدید ثبت کرد. شماره سفارش: #{displayId}",
    },
    review: {
      newSubject: "نظر جدید",
      newPreview: "{customerName} نظر جدیدی برای محصول ثبت کرد.",
      replySubject: "اعلان پاسخ به نظر",
      replyPreview: "{sellerName} به نظر پاسخ داد.",
      reportResolvedSubject: "نتیجه گزارش نظر",
      reportDeletedPreview: "نظری که گزارش کردید بررسی و حذف شد.",
      reportRejectedPreview: "بررسی شد، حذف نشد. اگر موافق نیستید، می‌توانید دوباره گزارش دهید.",
      imageReportResolvedSubject: "نتیجه بررسی تصویر",
      imageHiddenPreview: "از توجه و گزارش شما از طرف تیم Kayı.com سپاسگزاریم. تصویر به‌طور کامل از سیستم‌های ما حذف شد.",
      imagePublishedPreview: "از ادب و گزارش شما سپاسگزاریم. به نظر ما این تصویر سیاست‌های ما را نقض نمی‌کند؛ اگر موافق نیستید، لطفاً دوباره بررسی کرده و به ما گزارش دهید.",
    },
    follower: {
      subject: "دنبال‌کننده جدید",
      preview: "{customerName} فروشگاه را دنبال کرد.",
    },
    payout: {
      subject: "پرداخت ارسال شد",
      preview: "پرداخت شما با شماره #{displayId} ارسال شد: {amount} {currency}",
    },
    return: {
      subject: "درخواست مرجوعی جدید",
      preview: "{customerName} برای سفارش #{displayId} درخواست مرجوعی ثبت کرد.",
      receivedSubject: "مرجوعی دریافت شد",
      receivedPreview: "{sellerName} مرجوعی شما برای سفارش #{displayId} را دریافت کرد.",
    },
    request: {
      statusSubject: "وضعیت درخواست",
      acceptedPreview: "درخواست {label} شما تأیید شد.",
      rejectedPreview: "درخواست {label} شما رد شد.",
      fallbackTypeLabel: "درخواست",
      typeLabels: {
        product_category: "دسته‌بندی",
        product_collection: "مجموعه",
        product_tag: "برچسب",
        product_type: "نوع محصول",
        return_reason: "دلیل مرجوعی",
      },
    },
  },
  he: {
    genericCustomerName: "לקוח",
    genericSellerName: "מוכר",
    order: {
      subject: "הזמנה חדשה",
      preview: "{customerName} ביצע הזמנה חדשה. מספר הזמנה: #{displayId}",
    },
    review: {
      newSubject: "ביקורת חדשה",
      newPreview: "{customerName} השאיר ביקורת חדשה על המוצר.",
      replySubject: "התראה על תגובה לביקורת",
      replyPreview: "{sellerName} הגיב לביקורת.",
      reportResolvedSubject: "תוצאת דיווח על ביקורת",
      reportDeletedPreview: "הביקורת שדיווחת עליה נבדקה והוסרה.",
      reportRejectedPreview: "נבדקה, לא הוסרה. אם אינך מסכים, תוכל להגיש דיווח נוסף.",
      imageReportResolvedSubject: "תוצאת בדיקת התמונה",
      imageHiddenPreview: "תודה על תשומת הלב והדיווח, בשם צוות Kayı.com. התמונה הוסרה לחלוטין מהמערכות שלנו.",
      imagePublishedPreview: "תודה על הנימוס והדיווח. אנו סבורים שתמונה זו אינה מפרה את המדיניות שלנו; אם אינך מסכים, אנא בדוק שוב ודווח לנו פעם נוספת.",
    },
    follower: {
      subject: "עוקב חדש",
      preview: "{customerName} התחיל לעקוב אחרי החנות.",
    },
    payout: {
      subject: "התשלום נשלח",
      preview: "התשלום שלך #{displayId} נשלח: {amount} {currency}",
    },
    return: {
      subject: "בקשת החזרה חדשה",
      preview: "{customerName} ביקש/ה החזרה עבור הזמנה #{displayId}.",
      receivedSubject: "ההחזרה התקבלה",
      receivedPreview: "{sellerName} קיבל/ה את ההחזרה שלך עבור הזמנה #{displayId}.",
    },
    request: {
      statusSubject: "סטטוס הבקשה",
      acceptedPreview: "בקשת „{label}” שלך אושרה.",
      rejectedPreview: "בקשת „{label}” שלך נדחתה.",
      fallbackTypeLabel: "בקשה",
      typeLabels: {
        product_category: "קטגוריה",
        product_collection: "אוסף",
        product_tag: "תגית",
        product_type: "סוג מוצר",
        return_reason: "סיבת החזרה",
      },
    },
  },
  hu: {
    genericCustomerName: "Egy vásárló",
    genericSellerName: "Eladó",
    order: {
      subject: "Új rendelés",
      preview: "{customerName} új rendelést adott le. Rendelésszám: #{displayId}",
    },
    review: {
      newSubject: "Új értékelés",
      newPreview: "{customerName} új értékelést hagyott a termékről.",
      replySubject: "Értesítés az értékelésre adott válaszról",
      replyPreview: "{sellerName} válaszolt az értékelésre.",
      reportResolvedSubject: "Az értékelés bejelentésének eredménye",
      reportDeletedPreview: "Az Ön által bejelentett értékelést megvizsgáltuk és eltávolítottuk.",
      reportRejectedPreview: "Megvizsgálva, nem távolítottuk el. Ha nem ért egyet, újra bejelentheti.",
      imageReportResolvedSubject: "A kép ellenőrzésének eredménye",
      imageHiddenPreview: "Köszönjük figyelmességét és bejelentését a Kayı.com csapata nevében. A képet teljesen eltávolítottuk rendszereinkből.",
      imagePublishedPreview: "Köszönjük udvariasságát és bejelentését. Úgy véljük, ez a kép nem sérti szabályzatunkat; ha nem ért egyet, kérjük, ellenőrizze újra, és jelentse be ismét.",
    },
    follower: {
      subject: "Új követő",
      preview: "{customerName} követni kezdte a boltot.",
    },
    payout: {
      subject: "Kifizetés elküldve",
      preview: "A(z) #{displayId} kifizetése elküldve: {amount} {currency}",
    },
    return: {
      subject: "Új visszaküldési kérelem",
      preview: "{customerName} visszaküldést kért a(z) #{displayId} rendeléshez.",
      receivedSubject: "Visszaküldés megérkezett",
      receivedPreview: "{sellerName} megkapta a(z) #{displayId} rendeléshez tartozó visszaküldését.",
    },
    request: {
      statusSubject: "Kérelem állapota",
      acceptedPreview: "„{label}” kérelmét jóváhagytuk.",
      rejectedPreview: "„{label}” kérelmét elutasítottuk.",
      fallbackTypeLabel: "Kérelem",
      typeLabels: {
        product_category: "Kategória",
        product_collection: "Kollekció",
        product_tag: "Címke",
        product_type: "Terméktípus",
        return_reason: "Visszaküldés oka",
      },
    },
  },
  id: {
    genericCustomerName: "Seorang pelanggan",
    genericSellerName: "Penjual",
    order: {
      subject: "Pesanan Baru",
      preview: "{customerName} membuat pesanan baru. No. Pesanan: #{displayId}",
    },
    review: {
      newSubject: "Ulasan Baru",
      newPreview: "{customerName} memberikan ulasan baru pada produk.",
      replySubject: "Notifikasi Balasan Ulasan",
      replyPreview: "{sellerName} membalas ulasan tersebut.",
      reportResolvedSubject: "Hasil Laporan Ulasan",
      reportDeletedPreview: "Ulasan yang Anda laporkan telah ditinjau dan dihapus.",
      reportRejectedPreview: "Ditinjau, tidak dihapus. Jika Anda tidak setuju, Anda dapat mengirim laporan lagi.",
      imageReportResolvedSubject: "Hasil Peninjauan Gambar",
      imageHiddenPreview: "Terima kasih atas kepedulian dan laporan Anda, dari tim Kayı.com. Gambar telah sepenuhnya dihapus dari sistem kami.",
      imagePublishedPreview: "Terima kasih atas kesopanan dan laporan Anda. Kami menilai gambar ini tidak melanggar kebijakan kami; jika Anda tidak setuju, silakan tinjau kembali dan laporkan lagi kepada kami.",
    },
    follower: {
      subject: "Pengikut Baru",
      preview: "{customerName} mulai mengikuti toko.",
    },
    payout: {
      subject: "Pembayaran Terkirim",
      preview: "Pembayaran Anda #{displayId} telah dikirim: {amount} {currency}",
    },
    return: {
      subject: "Permintaan Retur Baru",
      preview: "{customerName} meminta retur untuk pesanan #{displayId}.",
      receivedSubject: "Retur Diterima",
      receivedPreview: "{sellerName} telah menerima retur Anda untuk pesanan #{displayId}.",
    },
    request: {
      statusSubject: "Status Permintaan",
      acceptedPreview: "Permintaan {label} Anda telah disetujui.",
      rejectedPreview: "Permintaan {label} Anda telah ditolak.",
      fallbackTypeLabel: "Permintaan",
      typeLabels: {
        product_category: "Kategori",
        product_collection: "Koleksi",
        product_tag: "Tag",
        product_type: "Jenis Produk",
        return_reason: "Alasan Retur",
      },
    },
  },
  ja: {
    genericCustomerName: "あるお客様",
    genericSellerName: "販売者",
    order: {
      subject: "新しい注文",
      preview: "{customerName}様から新しい注文が入りました。注文番号: #{displayId}",
    },
    review: {
      newSubject: "新しいレビュー",
      newPreview: "{customerName}様が商品に新しいレビューを投稿しました。",
      replySubject: "レビュー返信通知",
      replyPreview: "{sellerName}がレビューに返信しました。",
      reportResolvedSubject: "レビュー通報の結果",
      reportDeletedPreview: "通報されたレビューを確認し、削除しました。",
      reportRejectedPreview: "確認しましたが、削除しませんでした。ご納得いただけない場合は、再度通報できます。",
      imageReportResolvedSubject: "画像確認の結果",
      imageHiddenPreview: "ご配慮とご通報をいただき、Kayı.comチーム一同感謝いたします。画像はシステムから完全に削除されました。",
      imagePublishedPreview: "ご丁寧なご通報をありがとうございます。この画像は当社のポリシーに違反していないと判断しました。ご納得いただけない場合は、再度ご確認の上、改めてご通報ください。",
    },
    follower: {
      subject: "新しいフォロワー",
      preview: "{customerName}様がフォローを開始しました。",
    },
    payout: {
      subject: "出金が送信されました",
      preview: "出金 #{displayId} を送信しました: {amount} {currency}",
    },
    return: {
      subject: "新しい返品リクエスト",
      preview: "{customerName}様が注文 #{displayId} の返品をリクエストしました。",
      receivedSubject: "返品を受け取りました",
      receivedPreview: "{sellerName}が注文 #{displayId} の返品を受け取りました。",
    },
    request: {
      statusSubject: "リクエストの状況",
      acceptedPreview: "「{label}」のリクエストが承認されました。",
      rejectedPreview: "「{label}」のリクエストが却下されました。",
      fallbackTypeLabel: "リクエスト",
      typeLabels: {
        product_category: "カテゴリー",
        product_collection: "コレクション",
        product_tag: "タグ",
        product_type: "商品タイプ",
        return_reason: "返品理由",
      },
    },
  },
  ko: {
    genericCustomerName: "고객님",
    genericSellerName: "판매자",
    order: {
      subject: "새 주문",
      preview: "{customerName}님이 새 주문을 하셨습니다. 주문 번호: #{displayId}",
    },
    review: {
      newSubject: "새 리뷰",
      newPreview: "{customerName}님이 상품에 새 리뷰를 남겼습니다.",
      replySubject: "리뷰 답변 알림",
      replyPreview: "{sellerName}님이 리뷰에 답변했습니다.",
      reportResolvedSubject: "리뷰 신고 처리 결과",
      reportDeletedPreview: "신고하신 리뷰가 검토되어 삭제되었습니다.",
      reportRejectedPreview: "검토했으나 삭제되지 않았습니다. 동의하지 않으시면 다시 신고하실 수 있습니다.",
      imageReportResolvedSubject: "이미지 검토 결과",
      imageHiddenPreview: "관심을 가지고 신고해 주셔서 Kayı.com 팀을 대신해 감사드립니다. 해당 이미지는 저희 시스템에서 완전히 삭제되었습니다.",
      imagePublishedPreview: "정중하게 신고해 주셔서 감사합니다. 저희는 이 이미지가 정책을 위반하지 않는다고 판단했습니다. 동의하지 않으시면 다시 확인 후 재신고해 주세요.",
    },
    follower: {
      subject: "새 팔로워",
      preview: "{customerName}님이 팔로우를 시작했습니다.",
    },
    payout: {
      subject: "정산금 발송됨",
      preview: "정산금 #{displayId}이(가) 발송되었습니다: {amount} {currency}",
    },
    return: {
      subject: "새 반품 요청",
      preview: "{customerName}님이 주문 #{displayId}에 대해 반품을 요청했습니다.",
      receivedSubject: "반품 수령 완료",
      receivedPreview: "{sellerName}님이 주문 #{displayId}의 반품을 수령했습니다.",
    },
    request: {
      statusSubject: "요청 상태",
      acceptedPreview: "'{label}' 요청이 승인되었습니다.",
      rejectedPreview: "'{label}' 요청이 거절되었습니다.",
      fallbackTypeLabel: "요청",
      typeLabels: {
        product_category: "카테고리",
        product_collection: "컬렉션",
        product_tag: "태그",
        product_type: "상품 유형",
        return_reason: "반품 사유",
      },
    },
  },
  lt: {
    genericCustomerName: "Klientas",
    genericSellerName: "Pardavėjas",
    order: {
      subject: "Naujas užsakymas",
      preview: "{customerName} pateikė naują užsakymą. Užsakymo Nr.: #{displayId}",
    },
    review: {
      newSubject: "Naujas atsiliepimas",
      newPreview: "{customerName} paliko naują atsiliepimą apie produktą.",
      replySubject: "Pranešimas apie atsakymą į atsiliepimą",
      replyPreview: "{sellerName} atsakė į atsiliepimą.",
      reportResolvedSubject: "Atsiliepimo skundo rezultatas",
      reportDeletedPreview: "Jūsų apskųstas atsiliepimas buvo peržiūrėtas ir pašalintas.",
      reportRejectedPreview: "Peržiūrėta, nepašalinta. Jei nesutinkate, galite pateikti naują skundą.",
      imageReportResolvedSubject: "Vaizdo peržiūros rezultatas",
      imageHiddenPreview: "Dėkojame už dėmesingumą ir pranešimą Kayı.com komandos vardu. Vaizdas visiškai pašalintas iš mūsų sistemų.",
      imagePublishedPreview: "Dėkojame už mandagumą ir pranešimą. Manome, kad šis vaizdas nepažeidžia mūsų taisyklių; jei nesutinkate, patikrinkite dar kartą ir praneškite mums iš naujo.",
    },
    follower: {
      subject: "Naujas sekėjas",
      preview: "{customerName} pradėjo sekti parduotuvę.",
    },
    payout: {
      subject: "Išmoka išsiųsta",
      preview: "Jūsų išmoka #{displayId} buvo išsiųsta: {amount} {currency}",
    },
    return: {
      subject: "Naujas grąžinimo prašymas",
      preview: "{customerName} paprašė grąžinti užsakymą #{displayId}.",
      receivedSubject: "Grąžinimas gautas",
      receivedPreview: "{sellerName} gavo jūsų grąžinimą už užsakymą #{displayId}.",
    },
    request: {
      statusSubject: "Užklausos būsena",
      acceptedPreview: "Jūsų užklausa „{label}“ buvo patvirtinta.",
      rejectedPreview: "Jūsų užklausa „{label}“ buvo atmesta.",
      fallbackTypeLabel: "Užklausa",
      typeLabels: {
        product_category: "Kategorija",
        product_collection: "Kolekcija",
        product_tag: "Žyma",
        product_type: "Produkto tipas",
        return_reason: "Grąžinimo priežastis",
      },
    },
  },
  mk: {
    genericCustomerName: "Купувач",
    genericSellerName: "Продавач",
    order: {
      subject: "Нова нарачка",
      preview: "{customerName} направи нова нарачка. Бр. на нарачка: #{displayId}",
    },
    review: {
      newSubject: "Нова рецензија",
      newPreview: "{customerName} остави нова рецензија за производот.",
      replySubject: "Известување за одговор на рецензија",
      replyPreview: "{sellerName} одговори на рецензијата.",
      reportResolvedSubject: "Резултат од пријавата за рецензија",
      reportDeletedPreview: "Рецензијата што ја пријавивте беше прегледана и отстранета.",
      reportRejectedPreview: "Прегледано, не е отстрането. Ако не се согласувате, можете повторно да пријавите.",
      imageReportResolvedSubject: "Резултат од проверката на сликата",
      imageHiddenPreview: "Ви благодариме за вниманието и пријавата во име на тимот на Kayı.com. Сликата е целосно отстранета од нашите системи.",
      imagePublishedPreview: "Ви благодариме за љубезноста и пријавата. Сметаме дека оваа слика не ги крши нашите правила; ако не се согласувате, ве молиме проверете ја повторно и пријавете ни повторно.",
    },
    follower: {
      subject: "Нов следач",
      preview: "{customerName} почна да ја следи продавницата.",
    },
    payout: {
      subject: "Исплатата е испратена",
      preview: "Вашата исплата #{displayId} е испратена: {amount} {currency}",
    },
    return: {
      subject: "Ново барање за враќање",
      preview: "{customerName} побара враќање за нарачката #{displayId}.",
      receivedSubject: "Враќањето е примено",
      receivedPreview: "{sellerName} го прими вашето враќање за нарачката #{displayId}.",
    },
    request: {
      statusSubject: "Статус на барањето",
      acceptedPreview: "Вашето барање „{label}“ е одобрено.",
      rejectedPreview: "Вашето барање „{label}“ е одбиено.",
      fallbackTypeLabel: "Барање",
      typeLabels: {
        product_category: "Категорија",
        product_collection: "Колекција",
        product_tag: "Ознака",
        product_type: "Тип на производ",
        return_reason: "Причина за враќање",
      },
    },
  },
  mn: {
    genericCustomerName: "Нэг үйлчлүүлэгч",
    genericSellerName: "Худалдагч",
    order: {
      subject: "Шинэ захиалга",
      preview: "{customerName} шинэ захиалга өглөө. Захиалгын дугаар: #{displayId}",
    },
    review: {
      newSubject: "Шинэ сэтгэгдэл",
      newPreview: "{customerName} бүтээгдэхүүнд шинэ сэтгэгдэл үлдээлээ.",
      replySubject: "Сэтгэгдэлд хариулсан тухай мэдэгдэл",
      replyPreview: "{sellerName} сэтгэгдэлд хариулсан байна.",
      reportResolvedSubject: "Сэтгэгдлийн мэдээллийн үр дүн",
      reportDeletedPreview: "Таны мэдээлсэн сэтгэгдлийг шалгаж, устгалаа.",
      reportRejectedPreview: "Шалгасан ч устгаагүй. Хэрэв санал нийлэхгүй байвал дахин мэдээлж болно.",
      imageReportResolvedSubject: "Зургийн шалгалтын үр дүн",
      imageHiddenPreview: "Анхаарал болон мэдээлсэнд Kayı.com багийн зүгээс баярлалаа. Зургийг манай системээс бүрэн устгалаа.",
      imagePublishedPreview: "Эелдэг байдал болон мэдээлсэнд баярлалаа. Энэ зураг манай бодлогыг зөрчөөгүй гэж бид үзэж байна; санал нийлэхгүй байвал дахин шалгаж, бидэнд дахин мэдээлнэ үү.",
    },
    follower: {
      subject: "Шинэ дагагч",
      preview: "{customerName} дэлгүүрийг дагаж эхэллээ.",
    },
    payout: {
      subject: "Төлбөр илгээгдлээ",
      preview: "Таны #{displayId} дугаартай төлбөр илгээгдлээ: {amount} {currency}",
    },
    return: {
      subject: "Шинэ буцаалтын хүсэлт",
      preview: "{customerName} #{displayId} захиалгын буцаалтыг хүслээ.",
      receivedSubject: "Буцаалт хүлээн авлаа",
      receivedPreview: "{sellerName} таны #{displayId} захиалгын буцаалтыг хүлээн авлаа.",
    },
    request: {
      statusSubject: "Хүсэлтийн төлөв",
      acceptedPreview: "Таны «{label}» хүсэлт зөвшөөрөгдлөө.",
      rejectedPreview: "Таны «{label}» хүсэлт татгалзагдлаа.",
      fallbackTypeLabel: "Хүсэлт",
      typeLabels: {
        product_category: "Ангилал",
        product_collection: "Цуглуулга",
        product_tag: "Шошго",
        product_type: "Бүтээгдэхүүний төрөл",
        return_reason: "Буцаалтын шалтгаан",
      },
    },
  },
  nl: {
    genericCustomerName: "Een klant",
    genericSellerName: "Verkoper",
    order: {
      subject: "Nieuwe bestelling",
      preview: "{customerName} heeft een nieuwe bestelling geplaatst. Bestelnr.: #{displayId}",
    },
    review: {
      newSubject: "Nieuwe review",
      newPreview: "{customerName} heeft een nieuwe review op het product achtergelaten.",
      replySubject: "Melding van reactie op review",
      replyPreview: "{sellerName} heeft gereageerd op de review.",
      reportResolvedSubject: "Resultaat van reviewmelding",
      reportDeletedPreview: "De review die u heeft gemeld, is beoordeeld en verwijderd.",
      reportRejectedPreview: "Beoordeeld, niet verwijderd. Als u het er niet mee eens bent, kunt u opnieuw een melding indienen.",
      imageReportResolvedSubject: "Resultaat van afbeeldingscontrole",
      imageHiddenPreview: "Bedankt voor uw oplettendheid en melding, namens het Kayı.com-team. De afbeelding is volledig uit onze systemen verwijderd.",
      imagePublishedPreview: "Bedankt voor uw vriendelijkheid en melding. Wij zijn van mening dat deze afbeelding ons beleid niet schendt; als u het er niet mee eens bent, controleer deze dan opnieuw en meld het ons nogmaals.",
    },
    follower: {
      subject: "Nieuwe volger",
      preview: "{customerName} is de winkel gaan volgen.",
    },
    payout: {
      subject: "Uitbetaling verzonden",
      preview: "Uw uitbetaling #{displayId} is verzonden: {amount} {currency}",
    },
    return: {
      subject: "Nieuw retourverzoek",
      preview: "{customerName} heeft een retour aangevraagd voor bestelling #{displayId}.",
      receivedSubject: "Retour ontvangen",
      receivedPreview: "{sellerName} heeft uw retour voor bestelling #{displayId} ontvangen.",
    },
    request: {
      statusSubject: "Status van aanvraag",
      acceptedPreview: "Uw aanvraag '{label}' is goedgekeurd.",
      rejectedPreview: "Uw aanvraag '{label}' is afgewezen.",
      fallbackTypeLabel: "Aanvraag",
      typeLabels: {
        product_category: "Categorie",
        product_collection: "Collectie",
        product_tag: "Tag",
        product_type: "Producttype",
        return_reason: "Retourreden",
      },
    },
  },
  ro: {
    genericCustomerName: "Un client",
    genericSellerName: "Vânzător",
    order: {
      subject: "Comandă nouă",
      preview: "{customerName} a plasat o comandă nouă. Nr. comandă: #{displayId}",
    },
    review: {
      newSubject: "Recenzie nouă",
      newPreview: "{customerName} a lăsat o recenzie nouă la produs.",
      replySubject: "Notificare răspuns la recenzie",
      replyPreview: "{sellerName} a răspuns la recenzie.",
      reportResolvedSubject: "Rezultatul raportării recenziei",
      reportDeletedPreview: "Recenzia pe care ați raportat-o a fost examinată și eliminată.",
      reportRejectedPreview: "Examinată, neeliminată. Dacă nu sunteți de acord, puteți trimite un nou raport.",
      imageReportResolvedSubject: "Rezultatul examinării imaginii",
      imageHiddenPreview: "Vă mulțumim pentru atenție și pentru raportare, din partea echipei Kayı.com. Imaginea a fost eliminată complet din sistemele noastre.",
      imagePublishedPreview: "Vă mulțumim pentru amabilitate și pentru raportare. Considerăm că această imagine nu încalcă politica noastră; dacă nu sunteți de acord, vă rugăm să o verificați din nou și să ne-o raportați încă o dată.",
    },
    follower: {
      subject: "Urmăritor nou",
      preview: "{customerName} a început să urmărească magazinul.",
    },
    payout: {
      subject: "Plată trimisă",
      preview: "Plata dvs. #{displayId} a fost trimisă: {amount} {currency}",
    },
    return: {
      subject: "Cerere nouă de retur",
      preview: "{customerName} a solicitat returnarea comenzii #{displayId}.",
      receivedSubject: "Retur primit",
      receivedPreview: "{sellerName} a primit returul dvs. pentru comanda #{displayId}.",
    },
    request: {
      statusSubject: "Starea cererii",
      acceptedPreview: "Cererea dvs. „{label}” a fost aprobată.",
      rejectedPreview: "Cererea dvs. „{label}” a fost respinsă.",
      fallbackTypeLabel: "Cerere",
      typeLabels: {
        product_category: "Categorie",
        product_collection: "Colecție",
        product_tag: "Etichetă",
        product_type: "Tip de produs",
        return_reason: "Motiv de retur",
      },
    },
  },
  th: {
    genericCustomerName: "ลูกค้าท่านหนึ่ง",
    genericSellerName: "ผู้ขาย",
    order: {
      subject: "คำสั่งซื้อใหม่",
      preview: "{customerName} สั่งซื้อสินค้าใหม่ หมายเลขคำสั่งซื้อ: #{displayId}",
    },
    review: {
      newSubject: "รีวิวใหม่",
      newPreview: "{customerName} แสดงความคิดเห็นใหม่เกี่ยวกับสินค้า",
      replySubject: "การแจ้งเตือนการตอบกลับรีวิว",
      replyPreview: "{sellerName} ได้ตอบกลับรีวิว",
      reportResolvedSubject: "ผลการรายงานรีวิว",
      reportDeletedPreview: "รีวิวที่คุณรายงานได้รับการตรวจสอบและลบออกแล้ว",
      reportRejectedPreview: "ตรวจสอบแล้ว ไม่ได้ลบออก หากคุณไม่เห็นด้วย คุณสามารถส่งรายงานใหม่ได้",
      imageReportResolvedSubject: "ผลการตรวจสอบรูปภาพ",
      imageHiddenPreview: "ขอบคุณสำหรับความใส่ใจและการรายงานของคุณ ในนามของทีม Kayı.com รูปภาพถูกลบออกจากระบบของเราอย่างสมบูรณ์แล้ว",
      imagePublishedPreview: "ขอบคุณสำหรับความสุภาพและการรายงานของคุณ เราเห็นว่ารูปภาพนี้ไม่ได้ละเมิดนโยบายของเรา หากคุณไม่เห็นด้วย โปรดตรวจสอบอีกครั้งและรายงานให้เราทราบอีกครั้ง",
    },
    follower: {
      subject: "ผู้ติดตามใหม่",
      preview: "{customerName} เริ่มติดตามร้านค้าแล้ว",
    },
    payout: {
      subject: "ส่งการจ่ายเงินแล้ว",
      preview: "การจ่ายเงินของคุณหมายเลข #{displayId} ถูกส่งแล้ว: {amount} {currency}",
    },
    return: {
      subject: "คำขอคืนสินค้าใหม่",
      preview: "{customerName} ขอคืนสินค้าสำหรับคำสั่งซื้อ #{displayId}",
      receivedSubject: "ได้รับสินค้าคืนแล้ว",
      receivedPreview: "{sellerName} ได้รับสินค้าคืนของคุณสำหรับคำสั่งซื้อ #{displayId} แล้ว",
    },
    request: {
      statusSubject: "สถานะคำขอ",
      acceptedPreview: "คำขอ「{label}」ของคุณได้รับการอนุมัติแล้ว",
      rejectedPreview: "คำขอ「{label}」ของคุณถูกปฏิเสธ",
      fallbackTypeLabel: "คำขอ",
      typeLabels: {
        product_category: "หมวดหมู่",
        product_collection: "คอลเลกชัน",
        product_tag: "แท็ก",
        product_type: "ประเภทสินค้า",
        return_reason: "เหตุผลการคืนสินค้า",
      },
    },
  },
  vi: {
    genericCustomerName: "Một khách hàng",
    genericSellerName: "Người bán",
    order: {
      subject: "Đơn hàng mới",
      preview: "{customerName} đã đặt một đơn hàng mới. Mã đơn hàng: #{displayId}",
    },
    review: {
      newSubject: "Đánh giá mới",
      newPreview: "{customerName} đã để lại đánh giá mới cho sản phẩm.",
      replySubject: "Thông báo phản hồi đánh giá",
      replyPreview: "{sellerName} đã phản hồi đánh giá.",
      reportResolvedSubject: "Kết quả báo cáo đánh giá",
      reportDeletedPreview: "Đánh giá bạn đã báo cáo đã được xem xét và gỡ bỏ.",
      reportRejectedPreview: "Đã xem xét, không gỡ bỏ. Nếu bạn không đồng ý, bạn có thể gửi báo cáo khác.",
      imageReportResolvedSubject: "Kết quả xem xét hình ảnh",
      imageHiddenPreview: "Cảm ơn sự quan tâm và báo cáo của bạn, thay mặt đội ngũ Kayı.com. Hình ảnh đã được gỡ bỏ hoàn toàn khỏi hệ thống của chúng tôi.",
      imagePublishedPreview: "Cảm ơn sự lịch sự và báo cáo của bạn. Chúng tôi cho rằng hình ảnh này không vi phạm chính sách của chúng tôi; nếu bạn không đồng ý, vui lòng kiểm tra lại và báo cáo cho chúng tôi một lần nữa.",
    },
    follower: {
      subject: "Người theo dõi mới",
      preview: "{customerName} đã bắt đầu theo dõi cửa hàng.",
    },
    payout: {
      subject: "Đã gửi khoản thanh toán",
      preview: "Khoản thanh toán #{displayId} của bạn đã được gửi: {amount} {currency}",
    },
    return: {
      subject: "Yêu cầu trả hàng mới",
      preview: "{customerName} đã yêu cầu trả hàng cho đơn hàng #{displayId}.",
      receivedSubject: "Đã nhận hàng trả lại",
      receivedPreview: "{sellerName} đã nhận được hàng trả lại của bạn cho đơn hàng #{displayId}.",
    },
    request: {
      statusSubject: "Trạng thái yêu cầu",
      acceptedPreview: "Yêu cầu \"{label}\" của bạn đã được chấp thuận.",
      rejectedPreview: "Yêu cầu \"{label}\" của bạn đã bị từ chối.",
      fallbackTypeLabel: "Yêu cầu",
      typeLabels: {
        product_category: "Danh mục",
        product_collection: "Bộ sưu tập",
        product_tag: "Thẻ",
        product_type: "Loại sản phẩm",
        return_reason: "Lý do trả hàng",
      },
    },
  },
  zhCN: {
    genericCustomerName: "一位顾客",
    genericSellerName: "卖家",
    order: {
      subject: "新订单",
      preview: "{customerName} 提交了一个新订单。订单号:#{displayId}",
    },
    review: {
      newSubject: "新评价",
      newPreview: "{customerName} 对该商品发表了新评价。",
      replySubject: "评价回复通知",
      replyPreview: "{sellerName} 回复了该评价。",
      reportResolvedSubject: "评价举报结果",
      reportDeletedPreview: "您举报的评价已审核并已删除。",
      reportRejectedPreview: "已审核,未删除。如果您不同意,可以再次举报。",
      imageReportResolvedSubject: "图片审核结果",
      imageHiddenPreview: "感谢您的细心和举报,来自 Kayı.com 团队。该图片已从我们的系统中完全删除。",
      imagePublishedPreview: "感谢您的礼貌与举报。我们认为该图片未违反我们的政策;如果您不同意,请再次查看并重新举报。",
    },
    follower: {
      subject: "新关注者",
      preview: "{customerName} 开始关注该店铺了。",
    },
    payout: {
      subject: "打款已发送",
      preview: "您的打款 #{displayId} 已发送:{amount} {currency}",
    },
    return: {
      subject: "新退货申请",
      preview: "{customerName} 为订单 #{displayId} 申请了退货。",
      receivedSubject: "退货已收到",
      receivedPreview: "{sellerName} 已收到您订单 #{displayId} 的退货。",
    },
    request: {
      statusSubject: "申请状态",
      acceptedPreview: "您的「{label}」申请已获批准。",
      rejectedPreview: "您的「{label}」申请已被拒绝。",
      fallbackTypeLabel: "申请",
      typeLabels: {
        product_category: "分类",
        product_collection: "系列",
        product_tag: "标签",
        product_type: "商品类型",
        return_reason: "退货原因",
      },
    },
  },
  zhTW: {
    genericCustomerName: "一位顧客",
    genericSellerName: "賣家",
    order: {
      subject: "新訂單",
      preview: "{customerName} 送出了一筆新訂單。訂單編號:#{displayId}",
    },
    review: {
      newSubject: "新評價",
      newPreview: "{customerName} 對該商品發表了新評價。",
      replySubject: "評價回覆通知",
      replyPreview: "{sellerName} 回覆了該評價。",
      reportResolvedSubject: "評價檢舉結果",
      reportDeletedPreview: "您檢舉的評價已審核並移除。",
      reportRejectedPreview: "已審核,未移除。若您不同意,可再次檢舉。",
      imageReportResolvedSubject: "圖片審核結果",
      imageHiddenPreview: "感謝您的細心與檢舉,來自 Kayı.com 團隊。該圖片已從我們的系統中完全移除。",
      imagePublishedPreview: "感謝您的禮貌與檢舉。我們認為該圖片未違反我們的政策;若您不同意,請再次查看並重新檢舉。",
    },
    follower: {
      subject: "新追蹤者",
      preview: "{customerName} 開始關注該店鋪了。",
    },
    payout: {
      subject: "款項已發送",
      preview: "您的款項 #{displayId} 已發送:{amount} {currency}",
    },
    return: {
      subject: "新退貨申請",
      preview: "{customerName} 為訂單 #{displayId} 申請了退貨。",
      receivedSubject: "退貨已收到",
      receivedPreview: "{sellerName} 已收到您訂單 #{displayId} 的退貨。",
    },
    request: {
      statusSubject: "申請狀態",
      acceptedPreview: "您的「{label}」申請已核准。",
      rejectedPreview: "您的「{label}」申請已被拒絕。",
      fallbackTypeLabel: "申請",
      typeLabels: {
        product_category: "分類",
        product_collection: "系列",
        product_tag: "標籤",
        product_type: "商品類型",
        return_reason: "退貨原因",
      },
    },
  },
  ar: {
    genericCustomerName: "أحد العملاء",
    genericSellerName: "البائع",
    order: {
      subject: "طلب جديد",
      preview: "قام {customerName} بتقديم طلب جديد. رقم الطلب: #{displayId}",
    },
    review: {
      newSubject: "تقييم جديد",
      newPreview: "ترك {customerName} تقييمًا جديدًا على المنتج.",
      replySubject: "إشعار الرد على التقييم",
      replyPreview: "رد {sellerName} على التقييم.",
      reportResolvedSubject: "نتيجة الإبلاغ عن التقييم",
      reportDeletedPreview: "تمت مراجعة التقييم الذي أبلغت عنه وإزالته.",
      reportRejectedPreview: "تمت المراجعة، ولم تتم الإزالة. إذا كنت لا توافق، يمكنك تقديم بلاغ آخر.",
      imageReportResolvedSubject: "نتيجة مراجعة الصورة",
      imageHiddenPreview: "شكرًا لاهتمامك وإبلاغك، من فريق Kayı.com. تمت إزالة الصورة بالكامل من أنظمتنا.",
      imagePublishedPreview: "شكرًا لتهذيبك وإبلاغك. نرى أن هذه الصورة لا تنتهك سياستنا؛ إذا كنت لا توافق، يرجى مراجعتها مرة أخرى والإبلاغ عنها لنا مجددًا.",
    },
    follower: {
      subject: "متابع جديد",
      preview: "بدأ {customerName} بمتابعة المتجر.",
    },
    payout: {
      subject: "تم إرسال الدفعة",
      preview: "تم إرسال دفعتك رقم #{displayId}: {amount} {currency}",
    },
    return: {
      subject: "طلب إرجاع جديد",
      preview: "طلب {customerName} إرجاع الطلب رقم #{displayId}.",
      receivedSubject: "تم استلام الإرجاع",
      receivedPreview: "استلم {sellerName} إرجاعك لطلب #{displayId}.",
    },
    request: {
      statusSubject: "حالة الطلب",
      acceptedPreview: "تمت الموافقة على طلب «{label}» الخاص بك.",
      rejectedPreview: "تم رفض طلب «{label}» الخاص بك.",
      fallbackTypeLabel: "طلب",
      typeLabels: {
        product_category: "الفئة",
        product_collection: "المجموعة",
        product_tag: "الوسم",
        product_type: "نوع المنتج",
        return_reason: "سبب الإرجاع",
      },
    },
  },
}
