# Configuration file for the Sphinx documentation builder.
#
# For the full list of built-in configuration values, see the documentation:
# https://www.sphinx-doc.org/en/master/usage/configuration.html

# -- Project information -----------------------------------------------------
# https://www.sphinx-doc.org/en/master/usage/configuration.html#project-information

project = 'john-bampton'
copyright = '2025, John Bampton'
author = 'John Bampton'

# -- General configuration ---------------------------------------------------
# https://www.sphinx-doc.org/en/master/usage/configuration.html#general-configuration

extensions = []

templates_path = ['_templates']
exclude_patterns = []

# -- Options for HTML output -------------------------------------------------
# https://www.sphinx-doc.org/en/master/usage/configuration.html#options-for-html-output

html_theme = 'alabaster'
html_static_path = ['_static']
html_logo = "_static/images/logo.jpeg"

# Alabaster theme requires a list of sidebar templates
# This tells Sphinx to include your new HTML file in the sidebar
html_sidebars = {
    '**': [
        'about.html',  # Retains the default Alabaster sidebar
        'theme_switcher_sidebar.html',  # Your new custom sidebar
        'navigation.html',
        'searchbox.html',
        'icon_grid_sidebar.html'  # Your custom icon grid
    ]
}

# The other options remain the same
html_css_files = [
    'custom.css',
]

html_js_files = [
    'theme_switcher.js',
]
