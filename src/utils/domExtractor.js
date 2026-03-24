async function extractDOM(page) {
  return await page.evaluate(() => {
    function getXPath(el) {
      if (el.id) return `//*[@id="${el.id}"]`;
      const parts = [];
      while (el && el.nodeType === Node.ELEMENT_NODE) {
        let index = 0;
        let sibling = el.previousSibling;
        while (sibling) {
          if (sibling.nodeType === Node.ELEMENT_NODE && sibling.nodeName === el.nodeName) {
            index++;
          }
          sibling = sibling.previousSibling;
        }
        parts.unshift(`${el.nodeName.toLowerCase()}[${index + 1}]`);
        el = el.parentNode;
      }
      return '/' + parts.join('/');
    }

    return Array.from(document.querySelectorAll('*')).map(el => ({
      tag: el.tagName.toLowerCase(),
      id: el.id || null,
      class: el.className || null,
      name: el.getAttribute('name'),
      type: el.getAttribute('type'),
      text: el.innerText?.trim().slice(0, 200),
      attributes: Array.from(el.attributes).reduce((acc, attr) => {
        acc[attr.name] = attr.value;
        return acc;
      }, {}),
      xpath: getXPath(el),
      css: el.tagName.toLowerCase() +
        (el.id ? `#${el.id}` : '') +
        (el.className ? '.' + el.className.split(' ').join('.') : '')
    }));
  });
}

module.exports = { extractDOM };