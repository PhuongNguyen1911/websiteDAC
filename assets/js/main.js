/* Thợ Đúng — site behaviour (no dependencies) */
(function () {
  "use strict";
  var doc = document.documentElement;
  doc.classList.add("js");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Header shadow on scroll */
  var header = document.querySelector(".header");
  if (header) {
    var onScroll = function () { header.classList.toggle("is-scrolled", window.scrollY > 8); };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* Mobile drawer */
  var drawer = document.getElementById("drawer");
  var toggle = document.querySelector(".header .menu-toggle");
  function setDrawer(open) {
    if (!drawer || !toggle) return;
    drawer.classList.toggle("is-open", open);
    drawer.setAttribute("aria-hidden", open ? "false" : "true");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.style.overflow = open ? "hidden" : "";
    if (open) {
      var first = drawer.querySelector("nav a");
      if (first) first.focus();
    } else {
      toggle.focus({ preventScroll: true });
    }
  }
  if (toggle) toggle.addEventListener("click", function () { setDrawer(true); });
  if (drawer) {
    drawer.addEventListener("click", function (e) {
      if (e.target.closest("[data-close]")) setDrawer(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && drawer.classList.contains("is-open")) setDrawer(false);
    });
  }

  /* Count-up for the capacity ledger (one orchestrated moment) */
  var counters = document.querySelectorAll(".count[data-to]");
  var fmt = new Intl.NumberFormat("vi-VN");
  function run(el) {
    var to = parseInt(el.getAttribute("data-to"), 10);
    if (reduceMotion || !to) { el.textContent = fmt.format(to); return; }
    var start = null, dur = 1400;
    function frame(t) {
      if (!start) start = t;
      var p = Math.min((t - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt.format(Math.round(to * eased));
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  if (counters.length && "IntersectionObserver" in window) {
    if (!reduceMotion) counters.forEach(function (c) { c.textContent = "0"; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { run(en.target); io.unobserve(en.target); }
      });
    }, { threshold: 0.6 });
    counters.forEach(function (c) { io.observe(c); });
  }

  /* Service catalog filter (Dịch vụ page) */
  var filterBar = document.querySelector("[data-filter-bar]");
  if (filterBar) {
    filterBar.addEventListener("click", function (e) {
      var btn = e.target.closest("button[data-filter]");
      if (!btn) return;
      var f = btn.getAttribute("data-filter");
      filterBar.querySelectorAll("button").forEach(function (b) { b.setAttribute("aria-pressed", b === btn ? "true" : "false"); });
      document.querySelectorAll(".cat").forEach(function (card) {
        var jobs = card.querySelectorAll(".cat__jobs li");
        var visible = 0;
        jobs.forEach(function (li) {
          var show = f === "all" || li.getAttribute("data-type") === f;
          li.hidden = !show;
          if (show) visible++;
        });
        card.hidden = visible === 0;
      });
    });
  }

  /* "Đặt lịch" buttons on catalog prefill the device */
  document.querySelectorAll("[data-book]").forEach(function (a) {
    a.addEventListener("click", function () {
      var sel = document.getElementById("f-device");
      if (sel) sel.value = a.getAttribute("data-book");
      var seg = document.getElementById("seg-b2c");
      if (seg) { seg.checked = true; seg.dispatchEvent(new Event("change", { bubbles: true })); }
    });
  });

  /* Lead / booking form */
  document.querySelectorAll("[data-lead-form]").forEach(function (form) {
    var status = form.querySelector(".form__status");
    var submit = form.querySelector('button[type="submit"]');

    function syncSegment() {
      var seg = form.querySelector('input[name="segment"]:checked');
      var isB2B = seg && seg.value === "Doanh nghiệp";
      form.querySelectorAll("[data-b2b]").forEach(function (el) { el.hidden = !isB2B; });
      form.querySelectorAll("[data-b2c]").forEach(function (el) { el.hidden = isB2B; });
    }
    form.addEventListener("change", function (e) { if (e.target.name === "segment") syncSegment(); });
    syncSegment();

    function setErr(input, msg) {
      var wrap = input.closest(".field");
      var err = wrap && wrap.querySelector(".err");
      input.setAttribute("aria-invalid", msg ? "true" : "false");
      if (err) err.textContent = msg || "";
    }
    function validate() {
      var ok = true, firstBad = null;
      var name = form.elements.name, phone = form.elements.phone, need = form.elements.need, email = form.elements.email;
      if (name && !name.value.trim()) { setErr(name, "Nhập họ tên để Thợ Đúng xưng hô khi gọi lại."); ok = false; firstBad = firstBad || name; } else if (name) setErr(name, "");
      var digits = phone ? phone.value.replace(/\D/g, "") : "";
      if (phone && (digits.length < 9 || digits.length > 12)) { setErr(phone, "Nhập số điện thoại 9–12 chữ số, ví dụ 0983 05 09 05."); ok = false; firstBad = firstBad || phone; } else if (phone) setErr(phone, "");
      if (email && email.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) { setErr(email, "Email chưa đúng định dạng."); ok = false; firstBad = firstBad || email; } else if (email) setErr(email, "");
      if (need && !need.value) { setErr(need, "Chọn nhu cầu để Thợ Đúng chuyển đúng bộ phận."); ok = false; firstBad = firstBad || need; } else if (need) setErr(need, "");
      if (firstBad) firstBad.focus();
      return ok;
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      status.className = "form__status";
      status.textContent = "";
      if (!validate()) return;

      var data = {};
      new FormData(form).forEach(function (v, k) { data[k] = typeof v === "string" ? v.trim() : v; });
      data.page = location.pathname;

      submit.disabled = true;
      var label = submit.textContent;
      submit.textContent = "Đang gửi…";

      fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      }).then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (body) { return { ok: res.ok, body: body }; });
      }).then(function (r) {
        if (r.ok && r.body && r.body.ok) {
          status.className = "form__status is-ok";
          status.textContent = "Đã gửi yêu cầu. Thợ Đúng sẽ gọi lại cho bạn sớm nhất.";
          form.reset();
          syncSegment();
        } else {
          throw new Error("send-failed");
        }
      }).catch(function () {
        status.className = "form__status is-err";
        status.innerHTML = 'Chưa gửi được yêu cầu. Vui lòng gọi <a href="tel:+84983050905">0983 05 09 05</a> hoặc email <a href="mailto:phuong@dacanco.com">phuong@dacanco.com</a>.';
      }).finally(function () {
        submit.disabled = false;
        submit.textContent = label;
      });
    });
  });

  /* Order tracking (Tra cứu đơn) */
  var trackForm = document.querySelector("[data-track-form]");
  if (trackForm) {
    var tStatus = trackForm.querySelector(".form__status");
    var tBtn = trackForm.querySelector('button[type="submit"]');
    var tResult = document.querySelector("[data-track-result]");
    var codeIn = trackForm.elements.code, phoneIn = trackForm.elements.phone;
    var HOTLINE = '<a href="tel:+84983050905">0983 05 09 05</a>';

    var qs = new URLSearchParams(location.search);
    if (qs.get("ma")) codeIn.value = qs.get("ma").replace(/\s+/g, "").toUpperCase().slice(0, 40);
    codeIn.addEventListener("input", function () {
      var pos = codeIn.selectionStart;
      codeIn.value = codeIn.value.replace(/\s+/g, "").toUpperCase();
      try { codeIn.setSelectionRange(pos, pos); } catch (e) {}
    });
    phoneIn.addEventListener("input", function () { phoneIn.value = phoneIn.value.replace(/\D/g, "").slice(0, 3); });

    function fieldErr(input, msg) {
      var err = input.closest(".field").querySelector(".err");
      input.setAttribute("aria-invalid", msg ? "true" : "false");
      err.textContent = msg || "";
    }
    function norm(s) {
      return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();
    }
    function classify(status) {
      var s = norm(status);
      if (/thanh cong|hoan thanh|hoan tat|da lap/.test(s)) return { tone: "ok", step: 4, msg: "Đơn đã được lắp đặt xong. Cảm ơn bạn đã tin chọn Thợ Đúng." };
      if (/that bai|chua thanh cong|khong thanh cong/.test(s)) return { tone: "warn", step: 3, msg: "Lần lắp đặt chưa thành công. Thợ Đúng sẽ liên hệ để hẹn lại lịch. Cần gấp, vui lòng gọi hotline." };
      if (/khong co nhu cau|huy|tu choi/.test(s)) return { tone: "muted", step: 0, msg: "Đơn đã đóng do khách không có nhu cầu lắp đặt hoặc đã hủy. Nếu thông tin chưa đúng, vui lòng gọi hotline." };
      if (/dang lap|dang thi cong|dang xu ly|dang/.test(s)) return { tone: "info", step: 3, msg: "Kỹ thuật viên đang thực hiện lắp đặt." };
      if (/hen|phan cong|dieu phoi|xac nhan|da nhan|cho lap/.test(s)) return { tone: "info", step: 2, msg: "Đơn đã được điều phối. Kỹ thuật viên sẽ liên hệ trước khi đến." };
      return { tone: "info", step: 1, msg: "Thợ Đúng đã tiếp nhận đơn và đang sắp xếp kỹ thuật viên." };
    }
    function el(tag, cls, text) {
      var n = document.createElement(tag);
      if (cls) n.className = cls;
      if (text != null) n.textContent = text;
      return n;
    }
    function render(o) {
      var c = classify(o.status);
      tResult.innerHTML = "";
      var card = el("article", "order order--" + c.tone);
      var head = el("div", "order__head");
      var id = el("div", "order__id"); id.appendChild(el("small", null, "Mã đơn hàng")); id.appendChild(el("strong", null, o.code));
      head.appendChild(id);
      head.appendChild(el("span", "order__badge", o.status || "Đã tiếp nhận"));
      card.appendChild(head);

      if (c.step > 0) {
        var steps = ["Tiếp nhận đơn", "Hẹn lịch lắp", "Đang lắp đặt", "Hoàn tất"];
        var ol = el("ol", "order__steps");
        ol.setAttribute("aria-label", "Tiến trình đơn hàng");
        steps.forEach(function (label, i) {
          var n = i + 1, state = n < c.step ? "is-done" : n === c.step ? (c.tone === "ok" ? "is-done" : c.tone === "warn" ? "is-warn" : "is-current") : "";
          var li = el("li", state);
          li.appendChild(el("span", "dot"));
          li.appendChild(el("span", "lbl", label));
          if (state === "is-current" || state === "is-warn") li.setAttribute("aria-current", "step");
          ol.appendChild(li);
        });
        card.appendChild(ol);
      }
      card.appendChild(el("p", "order__msg", c.msg));

      var dl = el("dl", "order__meta");
      [["Ngày đơn hàng", o.orderDate], ["Ngày lắp đặt", o.installDate], ["Khu vực", o.province], ["Dịch vụ", o.service]].forEach(function (r) {
        if (!r[1]) return;
        var d = el("div"); d.appendChild(el("dt", null, r[0])); d.appendChild(el("dd", null, r[1])); dl.appendChild(d);
      });
      if (dl.children.length) card.appendChild(dl);
      if (o.note) card.appendChild(el("p", "order__note", o.note));

      var help = el("p", "order__help");
      help.innerHTML = 'Cần hỗ trợ về đơn này? Gọi ' + HOTLINE + ' hoặc <a href="https://zalo.me/0983050905" target="_blank" rel="noopener">nhắn Zalo</a>.';
      card.appendChild(help);
      tResult.appendChild(card);
      tResult.hidden = false;
      tResult.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest" });
    }

    trackForm.addEventListener("submit", function (e) {
      e.preventDefault();
      tStatus.className = "form__status"; tStatus.textContent = "";
      var code = codeIn.value.replace(/\s+/g, "").toUpperCase(), phone = phoneIn.value.replace(/\D/g, "");
      var ok = true;
      if (code.length < 4) { fieldErr(codeIn, "Nhập mã đơn hàng (ít nhất 4 ký tự)."); ok = false; } else fieldErr(codeIn, "");
      if (phone.length !== 3) { fieldErr(phoneIn, "Nhập đủ 3 số cuối số điện thoại."); ok = false; } else fieldErr(phoneIn, "");
      if (!ok) { (code.length < 4 ? codeIn : phoneIn).focus(); return; }

      tBtn.disabled = true;
      var label = tBtn.innerHTML;
      tBtn.textContent = "Đang tra cứu…";
      tResult.hidden = true;

      fetch("/api/tra-cuu", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: code, phone: phone }) })
        .then(function (res) { return res.json().catch(function () { return {}; }); })
        .then(function (r) {
          if (r && r.ok && r.order) { render(r.order); return; }
          var err = r && r.error, msg;
          if (err === "not_found") msg = "Không tìm thấy đơn khớp với mã đơn và 3 số cuối điện thoại. Kiểm tra lại mã đơn (viết liền) và số điện thoại đã dùng khi mua hàng.";
          else if (err === "locked") msg = "Bạn đã nhập sai nhiều lần. Vui lòng thử lại sau " + (r.minutes || 15) + " phút hoặc gọi " + HOTLINE + ".";
          else if (err === "invalid") msg = "Mã đơn hoặc số điện thoại chưa đúng định dạng.";
          else msg = "Hệ thống tra cứu đang bận. Vui lòng thử lại sau ít phút hoặc gọi " + HOTLINE + ".";
          tStatus.className = "form__status is-err";
          tStatus.innerHTML = msg;
        })
        .catch(function () {
          tStatus.className = "form__status is-err";
          tStatus.innerHTML = "Không kết nối được. Kiểm tra mạng rồi thử lại, hoặc gọi " + HOTLINE + ".";
        })
        .finally(function () { tBtn.disabled = false; tBtn.innerHTML = label; });
    });
  }

  /* Footer year */
  document.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
