require 'yaml'
require 'json'
require 'base64'
require 'open3'
require 'optparse'
require 'fileutils'

REPO = 'processmission-intern/mission-forge'.freeze
REPO_ID = 1428030862
TEMPLATES = %w[01-task.yml 02-bug.yml 03-improvement.yml 04-question.yml].freeze
PROJECT_LABELS = {'Zephyr' => 'project/zephyr', 'Linux' => 'project/linux', 'Yocto Project' => 'project/yocto'}.freeze

def api(path)
  output, error, status = Open3.capture3('gh', 'api', path)
  raise "GitHub read failed: #{error.strip}" unless status.success?
  JSON.parse(output)
end

def source_file(path, commit)
  result = api("repos/#{REPO}/contents/#{path}?ref=#{commit}")
  raise "Unsupported encoding: #{path}" unless result['encoding'] == 'base64'
  [Base64.decode64(result.fetch('content')).force_encoding('UTF-8'), result.fetch('sha')]
end

def task_labels(defaults, answers, catalog, year)
  unless year.is_a?(String) && year.match?(/\A20\d{2}\z/) && year.to_i >= 2026
    raise 'Confirm the task year and pass --year YYYY, for example --year 2026'
  end
  raise "Task year #{year} is not available in the label catalog" unless catalog.include?(year)
  difficulty = /\AL([0-4]) - /.match(answers.fetch('difficulty', '').to_s)
  raise 'Confirm a difficulty from L0 to L4 before preparing a task for publication' unless difficulty
  projects = answers.fetch('project')
  raise 'Confirm at least one project' unless projects.is_a?(Array) && !projects.empty?
  labels = defaults.reject { |name| name.match?(/\A\d{4}\z/) || name.start_with?('difficulty/', 'project/') }
  labels += [year, "difficulty/level#{difficulty[1]}"]
  labels += projects.map { |project| PROJECT_LABELS.fetch(project) }
  raise 'Selected labels are not available in the catalog' unless (labels - catalog).empty?
  labels.uniq
end

def registered_assignee(login, commit)
  raise 'Use a GitHub username for --assignee' unless login.match?(/\A[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){0,38}\z/i)
  user = api("users/#{login}")
  raw, = source_file("participants/#{user.fetch('login').downcase}.json", commit)
  record = JSON.parse(raw)
  unless user['type'] == 'User' && record['github_id'] == user['id'] && record['github_login'].downcase == user['login'].downcase
    raise 'Assignee registration does not match GitHub'
  end
  user.fetch('login')
end

def prepare(options)
  template = options.fetch(:template)
  raise 'Choose a supported template' unless TEMPLATES.include?(template)
  repo = api("repos/#{REPO}")
  raise 'Unexpected repository identity' unless repo.fetch('id') == REPO_ID
  branch = repo.fetch('default_branch')
  require 'uri'
  commit = api("repos/#{REPO}/commits/#{URI.encode_www_form_component(branch)}").fetch('sha')
  path = ".github/ISSUE_TEMPLATE/#{template}"
  raw, form_sha = source_file(path, commit)
  labels_raw, labels_sha = source_file('.github/labels.json', commit)
  catalog = JSON.parse(labels_raw).map { |label| label.fetch('name') }
  form = YAML.safe_load(raw, permitted_classes: [], permitted_symbols: [], aliases: false)
  raise 'Invalid form' unless form.is_a?(Hash) && form['body'].is_a?(Array)
  fields = form.fetch('body').reject { |field| field['type'] == 'markdown' }
  ids = fields.map { |field| field.fetch('id') }
  raise 'Duplicate field IDs' unless ids.uniq == ids
  fields.each do |field|
    raise "Unsupported field type: #{field['type']}" unless %w[input textarea dropdown].include?(field['type'])
    raise 'Unsupported rendered field; inspect the current template' if field.fetch('attributes').key?('render')
    field.fetch('attributes').fetch('label')
  end
  if options[:inspect]
    puts JSON.pretty_generate({repo: REPO, commit: commit, template: form,
      available_year_labels: catalog.grep(/\A20\d{2}\z/).sort,
      task_metadata: template == '01-task.yml' ? 'Confirm difficulty, project and --year before publication' : nil})
    return
  end
  answers = JSON.parse(File.read(options.fetch(:answers)))
  raise 'Answers must be an object keyed by field ID' unless answers.is_a?(Hash)
  unknown = answers.keys - ids
  raise "Unknown fields: #{unknown.join(', ')}" unless unknown.empty?
  sections = fields.map do |field|
    id = field.fetch('id')
    attributes = field.fetch('attributes')
    value = answers[id]
    empty = value.nil? || (value.is_a?(String) && value.strip.empty?) || value == []
    raise "Missing required field: #{id}" if empty && field.fetch('validations', {})['required']
    answer = if empty
      '_No response_'
    elsif field['type'] == 'dropdown'
      choices = attributes.fetch('options')
      if attributes['multiple']
        raise "Expected an array: #{id}" unless value.is_a?(Array) && value.all? { |item| item.is_a?(String) }
        raise "Duplicate selections: #{id}" unless value.uniq == value
        raise "Invalid selection: #{id}" unless (value - choices).empty?
        value.join(', ')
      else
        raise "Invalid selection: #{id}" unless value.is_a?(String) && choices.include?(value)
        value
      end
    else
      raise "Expected text: #{id}" unless value.is_a?(String)
      raise "Input must be one line: #{id}" if field['type'] == 'input' && value.match?(/[\r\n]/)
      value.strip
    end
    "### #{attributes.fetch('label')}\n\n#{answer}"
  end
  title = options.fetch(:title).strip
  prefix = form.fetch('title')
  title = prefix + title unless title.start_with?(prefix)
  raise 'Provide a specific single-line title' if title.delete_prefix(prefix).strip.empty? || title.match?(/[\r\n]/)
  raise 'Title exceeds 256 characters' if title.length > 256
  labels = form.fetch('labels')
  raise 'Expected a label array' unless labels.is_a?(Array)
  raise 'Template uses labels outside the catalog' unless (labels - catalog).empty?
  if template == '01-task.yml'
    labels = task_labels(labels, answers, catalog, options[:year])
    rules = api("repos/#{REPO}/contents/programs/#{options.fetch(:year)}/rules?ref=#{commit}")
    unless rules.is_a?(Array) && rules.any? { |entry| entry['type'] == 'file' && entry['name'].match?(/\Av\d+\.json\z/) }
      raise 'The selected year has no published rules'
    end
  elsif options[:year]
    raise '--year applies to practice tasks only'
  end
  labels.each do |label|
    api("repos/#{REPO}/labels/#{URI.encode_www_form_component(label)}")
  end
  body = sections.join("\n\n") + "\n"
  raise 'Body exceeds GitHub limit' if body.length > 65_536
  payload = {title: title, body: body, labels: labels}
  payload[:assignees] = [registered_assignee(options[:assignee], commit)] if options[:assignee]
  output = File.expand_path(options.fetch(:output))
  raise 'Output directory already exists; choose a new directory' if File.exist?(output)
  FileUtils.mkdir_p(output)
  File.write(File.join(output, 'body.md'), body)
  File.write(File.join(output, 'issue.json'), JSON.pretty_generate(payload) + "\n")
  File.write(File.join(output, 'source.json'), JSON.pretty_generate({repo: REPO,
    branch: branch, commit: commit, template: path, template_sha: form_sha,
    labels_sha: labels_sha, selected_labels: labels, selected_year: options[:year]}) + "\n")
  puts "Validated draft: #{output}"
end

if $PROGRAM_NAME == __FILE__
  options = {}
  parser = OptionParser.new do |p|
    p.banner = 'Usage: ruby prepare.rb --template FILE --inspect | --answers FILE --title TEXT --year YYYY --output DIR'
    p.on('--template FILE') { |v| options[:template] = v }
    p.on('--inspect') { options[:inspect] = true }
    p.on('--answers FILE') { |v| options[:answers] = v }
    p.on('--title TEXT') { |v| options[:title] = v }
    p.on('--year YYYY') { |v| options[:year] = v }
    p.on('--assignee USER') do |v|
      raise 'Choose exactly one assignee' if options.key?(:assignee)
      options[:assignee] = v
    end
    p.on('--output DIR') { |v| options[:output] = v }
  end
  begin
    parser.parse!
    raise 'Unexpected positional arguments' unless ARGV.empty?
    prepare(options)
  rescue StandardError => e
    warn e.message
    exit 1
  end
end
