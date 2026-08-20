Imports System.Data.SqlClient

Public Class frmDeleteEmpl
    Inherits System.Windows.Forms.Form

#Region " Windows Form Designer generated code "

    Public Sub New()
        MyBase.New()

        'This call is required by the Windows Form Designer.
        InitializeComponent()

        'Add any initialization after the InitializeComponent() call

    End Sub

    'Form overrides dispose to clean up the component list.
    Protected Overloads Overrides Sub Dispose(ByVal disposing As Boolean)
        If disposing Then
            If Not (components Is Nothing) Then
                components.Dispose()
            End If
        End If
        MyBase.Dispose(disposing)
    End Sub

    'Required by the Windows Form Designer
    Private components As System.ComponentModel.IContainer

    'NOTE: The following procedure is required by the Windows Form Designer
    'It can be modified using the Windows Form Designer.  
    'Do not modify it using the code editor.
    Friend WithEvents ComboBox1 As System.Windows.Forms.ComboBox
    Friend WithEvents TextBox1 As System.Windows.Forms.TextBox
    Friend WithEvents Label1 As System.Windows.Forms.Label
    Friend WithEvents Label2 As System.Windows.Forms.Label
    Friend WithEvents GroupBox1 As System.Windows.Forms.GroupBox
    Friend WithEvents Button1 As System.Windows.Forms.Button
    Friend WithEvents Button2 As System.Windows.Forms.Button
    Friend WithEvents GroupBox2 As System.Windows.Forms.GroupBox
    <System.Diagnostics.DebuggerStepThrough()> Private Sub InitializeComponent()
        Dim resources As System.ComponentModel.ComponentResourceManager = New System.ComponentModel.ComponentResourceManager(GetType(frmDeleteEmpl))
        Me.ComboBox1 = New System.Windows.Forms.ComboBox
        Me.TextBox1 = New System.Windows.Forms.TextBox
        Me.Label1 = New System.Windows.Forms.Label
        Me.Label2 = New System.Windows.Forms.Label
        Me.GroupBox1 = New System.Windows.Forms.GroupBox
        Me.Button1 = New System.Windows.Forms.Button
        Me.Button2 = New System.Windows.Forms.Button
        Me.GroupBox2 = New System.Windows.Forms.GroupBox
        Me.GroupBox1.SuspendLayout()
        Me.SuspendLayout()
        '
        'ComboBox1
        '
        Me.ComboBox1.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList
        Me.ComboBox1.Location = New System.Drawing.Point(12, 16)
        Me.ComboBox1.Name = "ComboBox1"
        Me.ComboBox1.Size = New System.Drawing.Size(176, 21)
        Me.ComboBox1.TabIndex = 0
        '
        'TextBox1
        '
        Me.TextBox1.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.TextBox1.Location = New System.Drawing.Point(12, 43)
        Me.TextBox1.Name = "TextBox1"
        Me.TextBox1.ReadOnly = True
        Me.TextBox1.Size = New System.Drawing.Size(176, 20)
        Me.TextBox1.TabIndex = 1
        '
        'Label1
        '
        Me.Label1.AutoSize = True
        Me.Label1.Location = New System.Drawing.Point(192, 18)
        Me.Label1.Name = "Label1"
        Me.Label1.Size = New System.Drawing.Size(63, 13)
        Me.Label1.TabIndex = 3
        Me.Label1.Text = "«·„” Œœ„ :"
        Me.Label1.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'Label2
        '
        Me.Label2.AutoSize = True
        Me.Label2.Location = New System.Drawing.Point(196, 47)
        Me.Label2.Name = "Label2"
        Me.Label2.Size = New System.Drawing.Size(43, 13)
        Me.Label2.TabIndex = 4
        Me.Label2.Text = "«·≈”„ :"
        Me.Label2.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'GroupBox1
        '
        Me.GroupBox1.Controls.Add(Me.Label2)
        Me.GroupBox1.Controls.Add(Me.TextBox1)
        Me.GroupBox1.Controls.Add(Me.ComboBox1)
        Me.GroupBox1.Controls.Add(Me.Label1)
        Me.GroupBox1.Location = New System.Drawing.Point(7, 6)
        Me.GroupBox1.Name = "GroupBox1"
        Me.GroupBox1.Size = New System.Drawing.Size(264, 71)
        Me.GroupBox1.TabIndex = 6
        Me.GroupBox1.TabStop = False
        '
        'Button1
        '
        Me.Button1.Location = New System.Drawing.Point(158, 93)
        Me.Button1.Name = "Button1"
        Me.Button1.Size = New System.Drawing.Size(75, 32)
        Me.Button1.TabIndex = 7
        Me.Button1.Text = "Õ–›"
        '
        'Button2
        '
        Me.Button2.Location = New System.Drawing.Point(46, 93)
        Me.Button2.Name = "Button2"
        Me.Button2.Size = New System.Drawing.Size(75, 32)
        Me.Button2.TabIndex = 8
        Me.Button2.Text = "≈€·«ﬁ"
        '
        'GroupBox2
        '
        Me.GroupBox2.Location = New System.Drawing.Point(7, 83)
        Me.GroupBox2.Name = "GroupBox2"
        Me.GroupBox2.Size = New System.Drawing.Size(264, 4)
        Me.GroupBox2.TabIndex = 9
        Me.GroupBox2.TabStop = False
        '
        'frmDeleteEmpl
        '
        Me.AutoScaleBaseSize = New System.Drawing.Size(5, 13)
        Me.ClientSize = New System.Drawing.Size(278, 131)
        Me.Controls.Add(Me.GroupBox2)
        Me.Controls.Add(Me.Button2)
        Me.Controls.Add(Me.Button1)
        Me.Controls.Add(Me.GroupBox1)
        Me.Icon = CType(resources.GetObject("$this.Icon"), System.Drawing.Icon)
        Me.MaximizeBox = False
        Me.MaximumSize = New System.Drawing.Size(286, 165)
        Me.MinimumSize = New System.Drawing.Size(286, 165)
        Me.Name = "frmDeleteEmpl"
        Me.RightToLeft = System.Windows.Forms.RightToLeft.Yes
        Me.SizeGripStyle = System.Windows.Forms.SizeGripStyle.Hide
        Me.StartPosition = System.Windows.Forms.FormStartPosition.CenterScreen
        Me.Text = "Õ–› „” Œœ„"
        Me.GroupBox1.ResumeLayout(False)
        Me.GroupBox1.PerformLayout()
        Me.ResumeLayout(False)

    End Sub

#End Region
    Sub Clear()

        Me.ComboBox1.Items.Clear()

        Try
            Dim cmd1 As New SqlCommand("SELECT UserName FROM Employees", cnn)
            Dim SqlReader As SqlDataReader

            'OPEN THE CONNECTION
            'FILL THE DATASET & THE COMBOBOX
            cnn.Open()
            Me.ComboBox1.Items.Clear()
            SqlReader = cmd1.ExecuteReader
            While SqlReader.Read
                Me.ComboBox1.Items.Add(SqlReader.Item(0))
            End While
            cnn.Close()

            Me.TextBox1.Clear()
            Me.ComboBox1.SelectedIndex = -1
        Catch ex As Exception
            MsgBox(ex.Message)
            Try
                cnn.Close()
            Catch

            End Try
        End Try
    End Sub

    Private Sub frmDeleteEmpl_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
        Clear()
        Me.ComboBox1.SelectedIndex = -1
    End Sub

    Private Sub ComboBox1_SelectedIndexChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles ComboBox1.SelectedIndexChanged
        Try
            Dim cmd As New SqlCommand("Select fullname from Employees Where username=N'" & Me.ComboBox1.SelectedItem & "'", cnn)

            cnn.Open()
            Me.TextBox1.Text = cmd.ExecuteScalar.ToString
            cnn.Close()
        Catch ex As Exception
            MsgBox(ex.Message)
            Try
                cnn.Close()
            Catch

            End Try
        End Try
    End Sub

    Private Sub Button2_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button2.Click
        Me.Close()
    End Sub

    Private Sub Button1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button1.Click
        If Employee = CStr(Me.TextBox1.Text) Then
            MsgBox("·« Ì„ﬂ‰ Õ–› «·„” Œœ„ «·Õ«·Ì")
            Clear()
        Else
            Dim strDel As String

            strDel = "Delete from Employees Where username=N'" & Me.ComboBox1.SelectedItem & "'"

            Dim cmd As New SqlCommand(strDel, cnn)

            cnn.Open()
            cmd.ExecuteNonQuery()
            MsgBox(" „ «·Õ–›")
            cmd.Dispose()
            cnn.Close()

            Clear()
        End If

    End Sub
End Class
