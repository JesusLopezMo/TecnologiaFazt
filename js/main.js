(function () {
  "use strict";

  const config = window.SITE_CONFIG || {};
  const phone = String(config.whatsapp || "").replace(/\D/g, "");
  const email = String(config.email || "").trim();
  const SUBJECT = "Solicitud de información - TecnologiaFazt";
  const GENERIC_BODY = "Hola, quiero información sobre sus servicios de TI para mi empresa.";

  const waUrl = (text) => `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;

  // Los saltos de línea de un mailto deben ir como CRLF.
  const mailUrl = (body) =>
    `mailto:${email}?subject=${encodeURIComponent(SUBJECT)}` +
    `&body=${encodeURIComponent(body).replace(/%0A/g, "%0D%0A")}`;

  if (phone) {
    document.querySelectorAll("[data-wa]").forEach((link) => {
      link.href = waUrl(link.dataset.wa);
      link.target = "_blank";
      link.rel = "noopener";
    });
    document.querySelectorAll("[data-wa-label]").forEach((el) => {
      el.textContent = config.whatsappVisible || `+${phone}`;
    });
  }

  if (email) {
    document.querySelectorAll("[data-mail]").forEach((link) => {
      link.href = mailUrl(GENERIC_BODY);
    });
    document.querySelectorAll("[data-mail-label]").forEach((el) => {
      el.textContent = email;
    });
  }

  const form = document.getElementById("formulario");
  const statusBox = document.getElementById("estado");
  const statusText = document.getElementById("estado-texto");
  const copyButton = document.getElementById("copiar");
  const floatButton = document.querySelector(".float-wa");
  let lastMessage = "";

  // El botón flotante taparía los campos del formulario en celulares.
  new IntersectionObserver(([entry]) => {
    floatButton.hidden = entry.isIntersecting;
  }).observe(form);

  // Los enlaces "Cotizar" dejan marcado el servicio en el formulario.
  document.querySelectorAll("[data-pick]").forEach((link) => {
    link.addEventListener("click", () => {
      form.querySelectorAll('input[name="servicio"]').forEach((box) => {
        if (box.value === link.dataset.pick) box.checked = true;
      });
    });
  });

  function showStatus(message, isError, canCopy) {
    statusText.textContent = message;
    statusBox.classList.toggle("status-err", Boolean(isError));
    copyButton.hidden = !canCopy;
    copyButton.textContent = "Copiar mensaje";
    statusBox.hidden = false;
  }

  function value(name) {
    return form.elements[name].value.trim();
  }

  function selectedServices() {
    return Array.from(form.querySelectorAll('input[name="servicio"]:checked'), (box) => box.value);
  }

  function markInvalid(field, invalid) {
    if (invalid) field.setAttribute("aria-invalid", "true");
    else field.removeAttribute("aria-invalid");
  }

  // Devuelve el texto del error, o una cadena vacía si todo está bien.
  function validate() {
    const { nombre, telefono, correo, detalle } = form.elements;
    const nameMissing = !value("nombre");
    const contactMissing = !value("telefono") && !value("correo");
    const phoneBad = Boolean(value("telefono")) && value("telefono").replace(/\D/g, "").length < 7;
    const mailBad = Boolean(value("correo")) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value("correo"));
    const needMissing = selectedServices().length === 0 && !value("detalle");

    markInvalid(nombre, nameMissing);
    markInvalid(telefono, contactMissing || phoneBad);
    markInvalid(correo, contactMissing || mailBad);

    let error = "";
    let focusTarget = null;
    if (nameMissing) {
      error = "Escribe tu nombre.";
      focusTarget = nombre;
    } else if (contactMissing) {
      error = "Déjanos un teléfono o un correo para responderte.";
      focusTarget = telefono;
    } else if (phoneBad) {
      error = "Revisa el número de teléfono.";
      focusTarget = telefono;
    } else if (mailBad) {
      error = "Revisa el correo electrónico.";
      focusTarget = correo;
    } else if (needMissing) {
      error = "Elige un servicio o cuéntanos qué necesitas.";
      focusTarget = detalle;
    }
    if (focusTarget) focusTarget.focus();
    return error;
  }

  function buildMessage() {
    const lines = ["Hola, quiero solicitar información.", "", `Nombre: ${value("nombre")}`];
    if (value("empresa")) lines.push(`Empresa: ${value("empresa")}`);
    if (value("telefono")) lines.push(`Teléfono: ${value("telefono")}`);
    if (value("correo")) lines.push(`Correo: ${value("correo")}`);
    const services = selectedServices();
    if (services.length) lines.push(`Servicios: ${services.join(", ")}`);
    if (value("detalle")) lines.push("", `Detalle: ${value("detalle")}`);
    return lines.join("\n");
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const error = validate();
    if (error) {
      showStatus(error, true, false);
      return;
    }

    const channel = event.submitter ? event.submitter.value : "whatsapp";
    lastMessage = buildMessage();

    if (channel === "whatsapp") {
      if (!phone) {
        showStatus("El número de WhatsApp todavía no está configurado.", true, true);
        return;
      }
      window.open(waUrl(lastMessage), "_blank", "noopener");
      showStatus("Abrimos WhatsApp con tu mensaje listo. Presiona enviar para que nos llegue.", false, false);
      return;
    }

    if (!email) {
      showStatus("El correo de contacto todavía no está configurado.", true, true);
      return;
    }
    window.location.href = mailUrl(lastMessage);
    showStatus(`Abrimos tu aplicación de correo con el mensaje listo. Si no se abrió, cópialo y envíalo a ${email}.`, false, true);
  });

  copyButton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(lastMessage);
      copyButton.textContent = "Copiado";
    } catch (err) {
      copyButton.textContent = "No se pudo copiar";
    }
  });
})();
