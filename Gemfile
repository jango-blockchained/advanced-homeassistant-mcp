source "https://rubygems.org"

gem "github-pages", group: :jekyll_plugins
gem "jekyll-theme-minimal"
gem "jekyll-relative-links"
gem "jekyll-seo-tag"
gem "jekyll-remote-theme"
gem "jekyll-github-metadata"
gem "faraday-retry"

# Windows and JRuby does not include zoneinfo files, so bundle the tzinfo-data gem
# and associated library.
platforms :mingw, :x64_mingw, :mswin, :jruby do
  gem "tzinfo", ">= 1"
  gem "tzinfo-data"
end

# Lock `http_parser.rb` gem to `v0.6.x` on JRuby builds since newer versions of the gem
# do not have a Java counterpart.
gem "http_parser.rb", "~> 0.6.0", :platforms => [:jruby]

# Add webrick for Ruby 3.0+
gem "webrick", "~> 1.7" 