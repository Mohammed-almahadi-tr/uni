Imports System.Data.SqlClient
Public Class frmDeleteAcc
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
    Friend WithEvents GroupBox3 As System.Windows.Forms.GroupBox
    Friend WithEvents btnClose As System.Windows.Forms.Button
    Friend WithEvents btnSave As System.Windows.Forms.Button
    Friend WithEvents GroupBox2 As System.Windows.Forms.GroupBox
    Friend WithEvents ListBox1 As System.Windows.Forms.ListBox
    Friend WithEvents GroupBox1 As System.Windows.Forms.GroupBox
    Friend WithEvents ComboBox1 As System.Windows.Forms.ComboBox
    Friend WithEvents Label2 As System.Windows.Forms.Label
    <System.Diagnostics.DebuggerStepThrough()> Private Sub InitializeComponent()
        Dim resources As System.ComponentModel.ComponentResourceManager = New System.ComponentModel.ComponentResourceManager(GetType(frmDeleteAcc))
        Me.GroupBox3 = New System.Windows.Forms.GroupBox
        Me.btnClose = New System.Windows.Forms.Button
        Me.btnSave = New System.Windows.Forms.Button
        Me.GroupBox2 = New System.Windows.Forms.GroupBox
        Me.ListBox1 = New System.Windows.Forms.ListBox
        Me.GroupBox1 = New System.Windows.Forms.GroupBox
        Me.ComboBox1 = New System.Windows.Forms.ComboBox
        Me.Label2 = New System.Windows.Forms.Label
        Me.GroupBox2.SuspendLayout()
        Me.GroupBox1.SuspendLayout()
        Me.SuspendLayout()
        '
        'GroupBox3
        '
        Me.GroupBox3.Location = New System.Drawing.Point(8, 295)
        Me.GroupBox3.Name = "GroupBox3"
        Me.GroupBox3.Size = New System.Drawing.Size(256, 3)
        Me.GroupBox3.TabIndex = 79
        Me.GroupBox3.TabStop = False
        '
        'btnClose
        '
        Me.btnClose.ImeMode = System.Windows.Forms.ImeMode.NoControl
        Me.btnClose.Location = New System.Drawing.Point(47, 304)
        Me.btnClose.Name = "btnClose"
        Me.btnClose.Size = New System.Drawing.Size(75, 32)
        Me.btnClose.TabIndex = 78
        Me.btnClose.Text = "«€·«ﬁ"
        '
        'btnSave
        '
        Me.btnSave.ImeMode = System.Windows.Forms.ImeMode.NoControl
        Me.btnSave.Location = New System.Drawing.Point(151, 304)
        Me.btnSave.Name = "btnSave"
        Me.btnSave.Size = New System.Drawing.Size(75, 32)
        Me.btnSave.TabIndex = 77
        Me.btnSave.Text = "Õ–›"
        '
        'GroupBox2
        '
        Me.GroupBox2.Controls.Add(Me.ListBox1)
        Me.GroupBox2.Location = New System.Drawing.Point(8, 56)
        Me.GroupBox2.Name = "GroupBox2"
        Me.GroupBox2.Size = New System.Drawing.Size(256, 233)
        Me.GroupBox2.TabIndex = 76
        Me.GroupBox2.TabStop = False
        Me.GroupBox2.Text = "«·Õ”«»«  «·—∆Ì”Ì…"
        '
        'ListBox1
        '
        Me.ListBox1.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.ListBox1.HorizontalScrollbar = True
        Me.ListBox1.Location = New System.Drawing.Point(10, 15)
        Me.ListBox1.Name = "ListBox1"
        Me.ListBox1.Size = New System.Drawing.Size(236, 210)
        Me.ListBox1.TabIndex = 70
        '
        'GroupBox1
        '
        Me.GroupBox1.Controls.Add(Me.ComboBox1)
        Me.GroupBox1.Controls.Add(Me.Label2)
        Me.GroupBox1.Location = New System.Drawing.Point(8, 8)
        Me.GroupBox1.Name = "GroupBox1"
        Me.GroupBox1.Size = New System.Drawing.Size(256, 48)
        Me.GroupBox1.TabIndex = 75
        Me.GroupBox1.TabStop = False
        '
        'ComboBox1
        '
        Me.ComboBox1.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList
        Me.ComboBox1.DropDownWidth = 250
        Me.ComboBox1.Location = New System.Drawing.Point(10, 16)
        Me.ComboBox1.Name = "ComboBox1"
        Me.ComboBox1.Size = New System.Drawing.Size(186, 21)
        Me.ComboBox1.Sorted = True
        Me.ComboBox1.TabIndex = 0
        '
        'Label2
        '
        Me.Label2.Font = New System.Drawing.Font("Tahoma", 8.0!)
        Me.Label2.ImeMode = System.Windows.Forms.ImeMode.NoControl
        Me.Label2.Location = New System.Drawing.Point(197, 18)
        Me.Label2.Name = "Label2"
        Me.Label2.Size = New System.Drawing.Size(48, 16)
        Me.Label2.TabIndex = 67
        Me.Label2.Text = "«·Õ“„… :"
        Me.Label2.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'frmDeleteAcc
        '
        Me.AutoScaleBaseSize = New System.Drawing.Size(5, 13)
        Me.ClientSize = New System.Drawing.Size(272, 341)
        Me.Controls.Add(Me.GroupBox3)
        Me.Controls.Add(Me.btnClose)
        Me.Controls.Add(Me.btnSave)
        Me.Controls.Add(Me.GroupBox2)
        Me.Controls.Add(Me.GroupBox1)
        Me.Icon = CType(resources.GetObject("$this.Icon"), System.Drawing.Icon)
        Me.MaximizeBox = False
        Me.MaximumSize = New System.Drawing.Size(280, 375)
        Me.MinimumSize = New System.Drawing.Size(280, 375)
        Me.Name = "frmDeleteAcc"
        Me.RightToLeft = System.Windows.Forms.RightToLeft.Yes
        Me.SizeGripStyle = System.Windows.Forms.SizeGripStyle.Hide
        Me.StartPosition = System.Windows.Forms.FormStartPosition.CenterScreen
        Me.Text = "Õ–› Õ”«» —∆Ì”Ì"
        Me.GroupBox2.ResumeLayout(False)
        Me.GroupBox1.ResumeLayout(False)
        Me.ResumeLayout(False)

    End Sub

#End Region

    Private Sub frmDeleteMainAcc_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
        Try
            Dim cmd As New SqlCommand("SELECT distinct Pack FROM Acc where pack is not null", cnn)
            Dim SqlReader As SqlDataReader

            'OPEN THE CONNECTION
            'FILL THE DATASET & THE COMBOBOX
            cnn.Open()
            Me.ComboBox1.Items.Clear()
            SqlReader = cmd.ExecuteReader
            While SqlReader.Read
                Me.ComboBox1.Items.Add(SqlReader.Item(0))
            End While
            cnn.Close()
        Catch ex As Exception
            MsgBox(ex.Message)
            Try
                cnn.Close()
            Catch

            End Try
        End Try
    End Sub

    Private Sub ComboBox1_SelectedIndexChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles ComboBox1.SelectedIndexChanged
        Try
            If Me.ComboBox1.SelectedIndex = -1 Then
                Me.ListBox1.Items.Clear()
                Exit Sub
            End If

            Dim cmd As New SqlCommand("SELECT distinct Acc FROM Acc where pack=N'" & Me.ComboBox1.SelectedItem & "' and Acc is not null", cnn)
            Dim SqlReader As SqlDataReader

            'OPEN THE CONNECTION
            'FILL THE DATASET & THE COMBOBOX
            cnn.Open()
            Me.ListBox1.Items.Clear()
            Me.ListBox1.Items.Clear()
            SqlReader = cmd.ExecuteReader
            While SqlReader.Read
                Me.ListBox1.Items.Add(SqlReader.Item(0))
            End While
            cnn.Close()

        Catch ex As Exception
            MsgBox(ex.Message)
            Try
                cnn.Close()
            Catch

            End Try
        End Try
    End Sub

    Private Sub btnSave_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles btnSave.Click
        If Me.ComboBox1.SelectedIndex = -1 Then
            MsgBox("«·—Ã«¡  ÕœÌœ «·Õ“„…")
            Me.ComboBox1.Focus()
            Exit Sub
        End If

        If Me.ListBox1.SelectedIndex = -1 Then
            MsgBox("«·—Ã«¡  ÕœÌœ «·Õ”«» «·—∆Ì”Ì")
            Me.ListBox1.Focus()
            Exit Sub
        End If

        Try
            Dim Balance As Double = GetBalanceAcc(Me.ComboBox1.SelectedItem, Me.ListBox1.SelectedItem)
            If Balance <> 0 Then
                MsgBox("·« Ì„ﬂ‰ Õ–› «·Õ”«»° ÌÃ» √‰ ÌﬂÊ‰ «·—’Ìœ ’›—")
                Exit Sub
            End If

            Dim X As MsgBoxResult
            X = MsgBox("                             √ﬂÌœ «·Õ–› ø", MsgBoxStyle.YesNo)
            If X = MsgBoxResult.No Then
                Exit Sub
            ElseIf X = MsgBoxResult.Yes Then
                Me.Cursor = Cursors.WaitCursor
                Dim cmd As New SqlCommand("delete from Acc where pack=N'" & Me.ComboBox1.SelectedItem & "' and Acc=N'" & Me.ListBox1.SelectedItem & "'", cnn)
                cnn.Open()
                cmd.ExecuteNonQuery()
                cnn.Close()
                MsgBox("      „ «·Õ–›")

                Try
                    Dim cmd1 As New SqlCommand("SELECT distinct Acc FROM Acc where pack=N'" & Me.ComboBox1.SelectedItem & "' and Acc is not null", cnn)
                    Dim SqlReader As SqlDataReader

                    'OPEN THE CONNECTION
                    'FILL THE DATASET & THE COMBOBOX
                    cnn.Open()
                    Me.ListBox1.Items.Clear()
                    SqlReader = cmd1.ExecuteReader
                    While SqlReader.Read
                        Me.ListBox1.Items.Add(SqlReader.Item(0))
                    End While
                    cnn.Close()
                    Me.Cursor = Cursors.Default
                Catch ex As Exception
                    Me.Cursor = Cursors.Default
                    MsgBox(ex.Message)
                    Try
                        cnn.Close()
                    Catch

                    End Try
                End Try
                Me.Cursor = Cursors.Default
            End If
            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            MsgBox(ex.Message)
            Try
                cnn.Close()
            Catch

            End Try
        End Try
        Me.Cursor = Cursors.Default
    End Sub

    Private Sub btnClose_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles btnClose.Click
        Me.Close()
    End Sub
End Class
