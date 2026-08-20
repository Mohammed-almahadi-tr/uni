<Global.Microsoft.VisualBasic.CompilerServices.DesignerGenerated()> _
Partial Class frmVouchersSerialsNo
    Inherits System.Windows.Forms.Form

    'Form overrides dispose to clean up the component list.
    <System.Diagnostics.DebuggerNonUserCode()> _
    Protected Overrides Sub Dispose(ByVal disposing As Boolean)
        Try
            If disposing AndAlso components IsNot Nothing Then
                components.Dispose()
            End If
        Finally
            MyBase.Dispose(disposing)
        End Try
    End Sub

    'Required by the Windows Form Designer
    Private components As System.ComponentModel.IContainer

    'NOTE: The following procedure is required by the Windows Form Designer
    'It can be modified using the Windows Form Designer.  
    'Do not modify it using the code editor.
    <System.Diagnostics.DebuggerStepThrough()> _
    Private Sub InitializeComponent()
        Me.components = New System.ComponentModel.Container
        Dim resources As System.ComponentModel.ComponentResourceManager = New System.ComponentModel.ComponentResourceManager(GetType(frmVouchersSerialsNo))
        Me.Button1 = New System.Windows.Forms.Button
        Me.GroupBox99 = New System.Windows.Forms.GroupBox
        Me.txtQnt = New System.Windows.Forms.TextBox
        Me.Label2 = New System.Windows.Forms.Label
        Me.txtLetter = New System.Windows.Forms.TextBox
        Me.Label1 = New System.Windows.Forms.Label
        Me.txtSTo = New System.Windows.Forms.TextBox
        Me.Label6 = New System.Windows.Forms.Label
        Me.txtSFrom = New System.Windows.Forms.TextBox
        Me.Label5 = New System.Windows.Forms.Label
        Me.ListView1 = New System.Windows.Forms.ListView
        Me.ColumnHeader3 = New System.Windows.Forms.ColumnHeader
        Me.ColumnHeader7 = New System.Windows.Forms.ColumnHeader
        Me.ColumnHeader1 = New System.Windows.Forms.ColumnHeader
        Me.ColumnHeader2 = New System.Windows.Forms.ColumnHeader
        Me.ColumnHeader4 = New System.Windows.Forms.ColumnHeader
        Me.Button5 = New System.Windows.Forms.Button
        Me.GroupBox6 = New System.Windows.Forms.GroupBox
        Me.CombUsers = New System.Windows.Forms.ComboBox
        Me.ErrProvider = New System.Windows.Forms.ErrorProvider(Me.components)
        Me.Button2 = New System.Windows.Forms.Button
        Me.GroupBox99.SuspendLayout()
        Me.GroupBox6.SuspendLayout()
        CType(Me.ErrProvider, System.ComponentModel.ISupportInitialize).BeginInit()
        Me.SuspendLayout()
        '
        'Button1
        '
        Me.Button1.Location = New System.Drawing.Point(105, 91)
        Me.Button1.Name = "Button1"
        Me.Button1.Size = New System.Drawing.Size(75, 24)
        Me.Button1.TabIndex = 2
        Me.Button1.Text = "حفظ"
        Me.Button1.UseVisualStyleBackColor = True
        '
        'GroupBox99
        '
        Me.GroupBox99.Controls.Add(Me.txtQnt)
        Me.GroupBox99.Controls.Add(Me.Label2)
        Me.GroupBox99.Controls.Add(Me.txtLetter)
        Me.GroupBox99.Controls.Add(Me.Label1)
        Me.GroupBox99.Controls.Add(Me.txtSTo)
        Me.GroupBox99.Controls.Add(Me.Label6)
        Me.GroupBox99.Controls.Add(Me.txtSFrom)
        Me.GroupBox99.Controls.Add(Me.Label5)
        Me.GroupBox99.Location = New System.Drawing.Point(186, 53)
        Me.GroupBox99.Name = "GroupBox99"
        Me.GroupBox99.Size = New System.Drawing.Size(416, 70)
        Me.GroupBox99.TabIndex = 1
        Me.GroupBox99.TabStop = False
        '
        'txtQnt
        '
        Me.txtQnt.Location = New System.Drawing.Point(8, 41)
        Me.txtQnt.Name = "txtQnt"
        Me.txtQnt.ReadOnly = True
        Me.txtQnt.Size = New System.Drawing.Size(83, 20)
        Me.txtQnt.TabIndex = 18
        Me.txtQnt.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'Label2
        '
        Me.Label2.AutoSize = True
        Me.Label2.Location = New System.Drawing.Point(97, 44)
        Me.Label2.Name = "Label2"
        Me.Label2.Size = New System.Drawing.Size(43, 13)
        Me.Label2.TabIndex = 17
        Me.Label2.Text = "الكمية :"
        Me.Label2.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'txtLetter
        '
        Me.txtLetter.Location = New System.Drawing.Point(279, 15)
        Me.txtLetter.Name = "txtLetter"
        Me.txtLetter.Size = New System.Drawing.Size(83, 20)
        Me.txtLetter.TabIndex = 0
        Me.txtLetter.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'Label1
        '
        Me.Label1.AutoSize = True
        Me.Label1.Location = New System.Drawing.Point(368, 18)
        Me.Label1.Name = "Label1"
        Me.Label1.Size = New System.Drawing.Size(42, 13)
        Me.Label1.TabIndex = 16
        Me.Label1.Text = "الحرف :"
        Me.Label1.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'txtSTo
        '
        Me.txtSTo.Location = New System.Drawing.Point(150, 41)
        Me.txtSTo.Name = "txtSTo"
        Me.txtSTo.Size = New System.Drawing.Size(83, 20)
        Me.txtSTo.TabIndex = 2
        Me.txtSTo.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'Label6
        '
        Me.Label6.AutoSize = True
        Me.Label6.Location = New System.Drawing.Point(239, 44)
        Me.Label6.Name = "Label6"
        Me.Label6.Size = New System.Drawing.Size(31, 13)
        Me.Label6.TabIndex = 14
        Me.Label6.Text = "إلى :"
        Me.Label6.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'txtSFrom
        '
        Me.txtSFrom.Location = New System.Drawing.Point(279, 41)
        Me.txtSFrom.Name = "txtSFrom"
        Me.txtSFrom.Size = New System.Drawing.Size(83, 20)
        Me.txtSFrom.TabIndex = 1
        Me.txtSFrom.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'Label5
        '
        Me.Label5.AutoSize = True
        Me.Label5.Location = New System.Drawing.Point(368, 44)
        Me.Label5.Name = "Label5"
        Me.Label5.Size = New System.Drawing.Size(28, 13)
        Me.Label5.TabIndex = 12
        Me.Label5.Text = "من :"
        Me.Label5.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'ListView1
        '
        Me.ListView1.Columns.AddRange(New System.Windows.Forms.ColumnHeader() {Me.ColumnHeader3, Me.ColumnHeader7, Me.ColumnHeader1, Me.ColumnHeader2, Me.ColumnHeader4})
        Me.ListView1.Font = New System.Drawing.Font("Times New Roman", 9.75!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.ListView1.FullRowSelect = True
        Me.ListView1.Location = New System.Drawing.Point(9, 129)
        Me.ListView1.Name = "ListView1"
        Me.ListView1.RightToLeftLayout = True
        Me.ListView1.Size = New System.Drawing.Size(593, 175)
        Me.ListView1.TabIndex = 3
        Me.ListView1.UseCompatibleStateImageBehavior = False
        Me.ListView1.View = System.Windows.Forms.View.Details
        '
        'ColumnHeader3
        '
        Me.ColumnHeader3.Text = "SNo"
        Me.ColumnHeader3.Width = 0
        '
        'ColumnHeader7
        '
        Me.ColumnHeader7.Text = "الحرف"
        '
        'ColumnHeader1
        '
        Me.ColumnHeader1.Text = "من"
        Me.ColumnHeader1.Width = 111
        '
        'ColumnHeader2
        '
        Me.ColumnHeader2.Text = "إلى"
        Me.ColumnHeader2.Width = 100
        '
        'ColumnHeader4
        '
        Me.ColumnHeader4.Text = "إجمالي الكمية"
        Me.ColumnHeader4.Width = 95
        '
        'Button5
        '
        Me.Button5.Location = New System.Drawing.Point(9, 310)
        Me.Button5.Name = "Button5"
        Me.Button5.Size = New System.Drawing.Size(75, 24)
        Me.Button5.TabIndex = 4
        Me.Button5.Text = "مسح"
        Me.Button5.UseVisualStyleBackColor = True
        '
        'GroupBox6
        '
        Me.GroupBox6.Controls.Add(Me.CombUsers)
        Me.GroupBox6.Location = New System.Drawing.Point(259, 4)
        Me.GroupBox6.Name = "GroupBox6"
        Me.GroupBox6.Size = New System.Drawing.Size(343, 47)
        Me.GroupBox6.TabIndex = 0
        Me.GroupBox6.TabStop = False
        Me.GroupBox6.Text = "المحصل"
        '
        'CombUsers
        '
        Me.CombUsers.AutoCompleteCustomSource.AddRange(New String() {"الخزينة"})
        Me.CombUsers.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList
        Me.CombUsers.ForeColor = System.Drawing.SystemColors.WindowText
        Me.CombUsers.FormattingEnabled = True
        Me.CombUsers.Location = New System.Drawing.Point(6, 17)
        Me.CombUsers.Name = "CombUsers"
        Me.CombUsers.Size = New System.Drawing.Size(302, 21)
        Me.CombUsers.TabIndex = 0
        '
        'ErrProvider
        '
        Me.ErrProvider.ContainerControl = Me
        '
        'Button2
        '
        Me.Button2.Location = New System.Drawing.Point(527, 310)
        Me.Button2.Name = "Button2"
        Me.Button2.Size = New System.Drawing.Size(75, 24)
        Me.Button2.TabIndex = 5
        Me.Button2.Text = "طباعة"
        Me.Button2.UseVisualStyleBackColor = True
        '
        'frmVouchersSerialsNo
        '
        Me.AutoScaleDimensions = New System.Drawing.SizeF(6.0!, 13.0!)
        Me.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font
        Me.ClientSize = New System.Drawing.Size(610, 338)
        Me.Controls.Add(Me.Button2)
        Me.Controls.Add(Me.GroupBox6)
        Me.Controls.Add(Me.Button5)
        Me.Controls.Add(Me.ListView1)
        Me.Controls.Add(Me.GroupBox99)
        Me.Controls.Add(Me.Button1)
        Me.Icon = CType(resources.GetObject("$this.Icon"), System.Drawing.Icon)
        Me.MaximizeBox = False
        Me.MaximumSize = New System.Drawing.Size(618, 372)
        Me.MinimumSize = New System.Drawing.Size(618, 372)
        Me.Name = "frmVouchersSerialsNo"
        Me.RightToLeft = System.Windows.Forms.RightToLeft.Yes
        Me.StartPosition = System.Windows.Forms.FormStartPosition.CenterScreen
        Me.Text = "إدارة الإيصالات"
        Me.GroupBox99.ResumeLayout(False)
        Me.GroupBox99.PerformLayout()
        Me.GroupBox6.ResumeLayout(False)
        CType(Me.ErrProvider, System.ComponentModel.ISupportInitialize).EndInit()
        Me.ResumeLayout(False)

    End Sub
    Friend WithEvents Button1 As System.Windows.Forms.Button
    Friend WithEvents GroupBox99 As System.Windows.Forms.GroupBox
    Friend WithEvents txtSTo As System.Windows.Forms.TextBox
    Friend WithEvents Label6 As System.Windows.Forms.Label
    Friend WithEvents txtSFrom As System.Windows.Forms.TextBox
    Friend WithEvents Label5 As System.Windows.Forms.Label
    Friend WithEvents ListView1 As System.Windows.Forms.ListView
    Friend WithEvents ColumnHeader1 As System.Windows.Forms.ColumnHeader
    Friend WithEvents ColumnHeader2 As System.Windows.Forms.ColumnHeader
    Friend WithEvents ColumnHeader3 As System.Windows.Forms.ColumnHeader
    Friend WithEvents Button5 As System.Windows.Forms.Button
    Friend WithEvents ColumnHeader7 As System.Windows.Forms.ColumnHeader
    Friend WithEvents ColumnHeader4 As System.Windows.Forms.ColumnHeader
    Friend WithEvents txtLetter As System.Windows.Forms.TextBox
    Friend WithEvents Label1 As System.Windows.Forms.Label
    Friend WithEvents GroupBox6 As System.Windows.Forms.GroupBox
    Friend WithEvents CombUsers As System.Windows.Forms.ComboBox
    Friend WithEvents txtQnt As System.Windows.Forms.TextBox
    Friend WithEvents Label2 As System.Windows.Forms.Label
    Friend WithEvents ErrProvider As System.Windows.Forms.ErrorProvider
    Friend WithEvents Button2 As System.Windows.Forms.Button
End Class
