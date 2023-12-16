  const currentPath = window.location.pathname;

  const navLinks = document.querySelectorAll('.nav-link');
  
  for (const link of navLinks) {
    const linkPath = link.getAttribute('href');
    if (currentPath.startsWith(linkPath)) {
      link.classList.add('active');
      link.parentNode.classList.add('active');
      link.style.color = 'white';

      const linkText = link.querySelector('.nav-link-text');
      if (linkText) {
        linkText.style.color = 'white';
      }

      const icon = link.querySelector('.bi');
      if (icon) {
        icon.classList.add('text-white');
      }
      break;
    }
  }