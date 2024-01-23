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

  fetch('/api/userSession')
  .then(response => response.json())
    .then(data => {
      const usernamePlaceholder = document.getElementById('usernamePlaceholder');
      const userId = {userId: data.userId}

      fetch('/api/userInfo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userId)
      })
      .then(response => response.json())
        .then(res => {
          const username = res.data["firstName"]
          usernamePlaceholder.innerText = username
        })
    })
  .catch(error => console.error('Error fetching user information:', error));

  const signOutLink = document.getElementById('signOutLink');
    if (signOutLink) {
      signOutLink.addEventListener('click', function (event) {
        event.preventDefault();
  
        fetch('/api/signout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })
        .then(response => {
          if (response.ok) {
            console.log('Signout successful');
            window.location.reload();
          } else {
            console.error('Failed to sign out');
          }
        })
        .catch(error => console.error('Error during signout:', error));
      });
    }
